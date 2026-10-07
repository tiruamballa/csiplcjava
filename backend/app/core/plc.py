from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.student import Student


def get_plc_roll_map(db: Session) -> dict[int, str]:
    """Generates a mapping from student.id -> plc_roll_number.
    Lab 1 students get plc101, plc102, ... (ordered by registration number).
    Lab 2 students get plc201, plc202, ... (ordered by registration number).
    """
    plc_map: dict[int, str] = {}
    for lab_name, lab_code in [("Lab 1", "1"), ("Lab 2", "2")]:
        students = db.scalars(
            select(Student)
            .where(Student.lab == lab_name)
            .order_by(func.lower(Student.roll_number))
        ).all()
        for idx, s in enumerate(students, start=1):
            plc_map[s.id] = f"plc{lab_code}{idx:02d}"
    return plc_map
