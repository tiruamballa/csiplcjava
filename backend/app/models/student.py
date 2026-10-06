from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# There are exactly two labs.
LABS = ("Lab 1", "Lab 2")
DEFAULT_LAB = "Lab 1"


class Student(Base):
    """One student = one row. `lab` is only the student's CURRENT lab.

    Attendance is stored against students.id (never against the lab), so moving a student
    from one lab to the other never touches their attendance history.
    Students never log in.
    """
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True)
    roll_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)  # registration number
    name: Mapped[str] = mapped_column(String(100))
    lab: Mapped[str] = mapped_column(String(10), default=DEFAULT_LAB, server_default=DEFAULT_LAB, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Deleting a student also deletes their attendance records.
    records: Mapped[list["AttendanceRecord"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
