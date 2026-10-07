from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.core.plc import get_plc_roll_map
from app.database import get_db
from app.models.attendance import AttendanceRecord
from app.models.student import Student

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/students")
def lookup_students(q: str = Query(default=""), db: Session = Depends(get_db)):
    """Public case-insensitive lookup for students by roll number, PLC roll number (e.g. plc102), or name.
    Returns assigned lab, PLC roll number, attendance counts, and percentage."""
    present = func.coalesce(func.sum(case((AttendanceRecord.status == "Present", 1), else_=0)), 0)
    total = func.count(AttendanceRecord.id)
    stmt = (
        select(Student.id, Student.roll_number, Student.name, Student.lab, present, total)
        .outerjoin(AttendanceRecord, AttendanceRecord.student_id == Student.id)
        .group_by(Student.id, Student.roll_number, Student.name, Student.lab)
        .order_by(func.lower(Student.roll_number))
    )
    rows = db.execute(stmt).all()
    plc_map = get_plc_roll_map(db)

    results = []
    term = q.strip().lower() if q else ""
    for i, r, n, l, p, t in rows:
        plc_code = plc_map.get(i, "")
        if term and not (term in r.lower() or term in n.lower() or term in plc_code.lower()):
            continue
        results.append({
            "id": i,
            "roll_number": r,
            "plc_roll_number": plc_code,
            "name": n,
            "lab": l,
            "present": int(p),
            "total": int(t),
            "percentage": round(int(p) / int(t) * 100, 1) if t else 0.0,
        })
    return results
