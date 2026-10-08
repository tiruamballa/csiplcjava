from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_admin
from app.config import today_local
from app.database import get_db
from app.models.attendance import AttendanceRecord
from app.models.student import Student
from app.schemas.attendance import (
    AttendanceDay, AttendanceRow, AttendanceSave, ReportOut, SessionSummary, StudentSummary,
)
from app.schemas.student import Lab

# Every route here requires a valid admin JWT.
router = APIRouter(prefix="/admin/attendance", tags=["attendance"], dependencies=[Depends(get_current_admin)])

# NOTE: /sessions and /report are declared BEFORE /{session_date}.


@router.get("/sessions", response_model=list[SessionSummary])
def list_sessions(db: Session = Depends(get_db)):
    """Attendance history: one row per date + lab."""
    lab = func.coalesce(AttendanceRecord.lab, "Lab 1")
    present = func.coalesce(func.sum(case((AttendanceRecord.status == "Present", 1), else_=0)), 0)
    absent = func.coalesce(func.sum(case((AttendanceRecord.status == "Absent", 1), else_=0)), 0)
    rows = db.execute(
        select(AttendanceRecord.session_date, lab, present, absent)
        .group_by(AttendanceRecord.session_date, lab)
        .order_by(AttendanceRecord.session_date.desc(), lab.asc())
    ).all()
    return [SessionSummary(session_date=d, lab=l, present=int(p), absent=int(a)) for d, l, p, a in rows]


@router.get("/report", response_model=ReportOut)
def attendance_report(lab: Lab | None = Query(default=None), db: Session = Depends(get_db)):
    """Per-student totals. The `lab` filter only chooses WHICH students (by their current lab);
    every attendance record of those students is counted, whatever lab it was taken in.
    Percentage = Present / Total sessions recorded for that student x 100."""
    present = func.coalesce(func.sum(case((AttendanceRecord.status == "Present", 1), else_=0)), 0)
    total = func.count(AttendanceRecord.id)
    stmt = (
        select(Student.id, Student.roll_number, Student.name, Student.lab, present, total)
        .outerjoin(AttendanceRecord, AttendanceRecord.student_id == Student.id)
        .group_by(Student.id, Student.roll_number, Student.name, Student.lab)
        .order_by(func.lower(Student.roll_number))
    )
    if lab:
        stmt = stmt.where(Student.lab == lab)
    rows = db.execute(stmt).all()
    students = [
        StudentSummary(
            id=i, roll_number=r, name=n, lab=l, present=int(p), absent=int(t) - int(p), total=int(t),
            percentage=round(int(p) / int(t) * 100, 1) if t else 0.0,
        )
        for i, r, n, l, p, t in rows
    ]
    sessions_stmt = select(func.count(func.distinct(AttendanceRecord.session_date)))
    if lab:
        sessions_stmt = sessions_stmt.join(Student, Student.id == AttendanceRecord.student_id).where(Student.lab == lab)
    return ReportOut(total_sessions=db.scalar(sessions_stmt) or 0, students=students)


def _day(db: Session, d: date, lab: str, skipped: int = 0) -> AttendanceDay:
    """The attendance sheet for one date + lab:
    students currently in this lab, plus anyone who was marked in this lab on this date but has
    since been moved (so an old sheet still shows exactly who was on it)."""
    records = {r.student_id: r for r in db.scalars(select(AttendanceRecord).where(AttendanceRecord.session_date == d))}
    recorded_here = [sid for sid, r in records.items() if r.lab == lab]
    stmt = select(Student).where(
        or_(Student.lab == lab, Student.id.in_(recorded_here) if recorded_here else False)
    ).order_by(func.lower(Student.roll_number))
    rows = []
    for s in db.scalars(stmt):
        r = records.get(s.id)
        rows.append(AttendanceRow(
            student_id=s.id, roll_number=s.roll_number, name=s.name, current_lab=s.lab,
            status=r.status if r else None,
            recorded_lab=(r.lab or s.lab) if r else None,
            locked=bool(r and r.lab and r.lab != lab),
        ))
    return AttendanceDay(session_date=d, lab=lab, saved=bool(recorded_here), students=rows, skipped=skipped)


@router.get("/{session_date}", response_model=AttendanceDay)
def get_day(session_date: date, lab: Lab = Query(...), db: Session = Depends(get_db)):
    return _day(db, session_date, lab)


@router.put("/{session_date}", response_model=AttendanceDay)
def save_day(session_date: date, data: AttendanceSave, db: Session = Depends(get_db)):
    """Create or update attendance for one date + lab (safe to save repeatedly)."""
    if session_date > today_local():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't take attendance for a future date.")

    ids = [m.student_id for m in data.records]
    if len(ids) != len(set(ids)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A student appears more than once.")
    students = {s.id: s for s in db.scalars(select(Student).where(Student.id.in_(ids)))}
    if set(students) != set(ids):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Some students no longer exist. Reload the page.")

    existing = {
        r.student_id: r
        for r in db.scalars(select(AttendanceRecord).where(AttendanceRecord.session_date == session_date))
    }
    skipped = 0
    for m in data.records:
        s, rec = students[m.student_id], existing.get(m.student_id)
        if rec is not None and rec.lab and rec.lab != data.lab:
            skipped += 1  # already marked on this date in the other lab: leave it untouched
            continue
        if rec is None and s.lab != data.lab:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"{s.name} is no longer in {data.lab}. Reload the page."
            )
        if rec is None:
            db.add(AttendanceRecord(student_id=s.id, session_date=session_date, status=m.status, lab=data.lab))
        else:
            rec.status = m.status
            rec.lab = data.lab
    db.commit()
    return _day(db, session_date, data.lab, skipped=skipped)


@router.delete("/{session_date}", status_code=status.HTTP_204_NO_CONTENT)
def delete_day(session_date: date, lab: Lab = Query(...), db: Session = Depends(get_db)):
    """Remove one lab's attendance for one date (e.g. taken on the wrong date)."""
    for r in db.scalars(
        select(AttendanceRecord).where(
            AttendanceRecord.session_date == session_date,
            func.coalesce(AttendanceRecord.lab, "Lab 1") == lab,
        )
    ):
        db.delete(r)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/stats/overview")
def overview(db: Session = Depends(get_db)):
    """Dynamic counts for dashboards (never hard-coded)."""
    rows = dict(db.execute(select(Student.lab, func.count(Student.id)).group_by(Student.lab)).all())
    return {
        "total": sum(rows.values()),
        "lab1": rows.get("Lab 1", 0),
        "lab2": rows.get("Lab 2", 0),
        "sessions": db.scalar(select(func.count(func.distinct(AttendanceRecord.session_date)))) or 0,
    }
