from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attendance import AttendanceRecord
from app.models.student import Student

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/students")
def lookup_students(q: str = Query(default=""), db: Session = Depends(get_db)):
    """Public case-insensitive lookup for students by roll number or name (including middle names).
    Returns assigned lab, attendance counts, and percentage."""
    present = func.coalesce(func.sum(case((AttendanceRecord.status == "Present", 1), else_=0)), 0)
    total = func.count(AttendanceRecord.id)
    stmt = (
        select(Student.id, Student.roll_number, Student.name, Student.lab, present, total)
        .outerjoin(AttendanceRecord, AttendanceRecord.student_id == Student.id)
        .group_by(Student.id, Student.roll_number, Student.name, Student.lab)
        .order_by(func.lower(Student.roll_number))
    )
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Student.roll_number).like(term),
                func.lower(Student.name).like(term),
            )
        )
    rows = db.execute(stmt).all()
    return [
        {
            "id": i,
            "roll_number": r,
            "name": n,
            "lab": l,
            "present": int(p),
            "total": int(t),
            "percentage": round(int(p) / int(t) * 100, 1) if t else 0.0,
        }
        for i, r, n, l, p, t in rows
    ]
