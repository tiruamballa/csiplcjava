"""PLC roll-number mapping and generation helpers."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.student import Student


def get_plc_roll_map(db: Session) -> dict[int, str]:
    """Return dict mapping student_id -> fixed stored plc_roll_number."""
    students = db.scalars(select(Student)).all()
    return {s.id: s.plc_roll_number or "" for s in students}


def generate_next_plc_roll_number(db: Session, lab: str) -> str:
    """Auto-generates next continuous PLC roll number for a new student in the specified lab.
    Lab 1 -> plc101, plc102...
    Lab 2 -> plc201, plc202...
    """
    lab_code = "1" if lab == "Lab 1" else "2"
    prefix = f"plc{lab_code}"

    plc_numbers = db.scalars(
        select(Student.plc_roll_number).where(Student.plc_roll_number.ilike(f"{prefix}%"))
    ).all()

    max_num = 0
    for p in plc_numbers:
        if p and p.lower().startswith(prefix):
            digits = p[len(prefix):]
            if digits.isdigit():
                max_num = max(max_num, int(digits))

    next_num = max_num + 1
    return f"{prefix}{next_num:02d}"
