from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    # One record per student per day.
    __table_args__ = (UniqueConstraint("student_id", "session_date", name="uq_student_session"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # Attendance belongs to the STUDENT (by id), not to a lab.
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    session_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(10))  # Present | Absent
    # Which lab's session this was marked in. It is a snapshot used ONLY to show the history
    # ("08 Oct - Lab 1: 38 present"). It never changes when the student is moved to another lab,
    # and the report/percentage ignore it completely.
    lab: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    marked_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    student: Mapped["Student"] = relationship(back_populates="records")
