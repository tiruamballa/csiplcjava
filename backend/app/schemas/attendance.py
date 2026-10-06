from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.student import Lab

Status = Literal["Present", "Absent"]


class AttendanceMark(BaseModel):
    student_id: int
    status: Status


class AttendanceSave(BaseModel):
    lab: Lab
    records: list[AttendanceMark] = Field(min_length=1, max_length=1000)


class AttendanceRow(BaseModel):
    """One student in the attendance sheet for a given date + lab."""
    student_id: int
    roll_number: str
    name: str
    current_lab: Lab          # where the student is today
    status: Status | None     # None = not marked yet for this date
    recorded_lab: Lab | None  # lab the existing mark was taken in
    locked: bool = False      # already marked on this date in the OTHER lab -> shown read-only


class AttendanceDay(BaseModel):
    session_date: date
    lab: Lab
    saved: bool  # True if attendance was already taken for this date + lab
    students: list[AttendanceRow]
    skipped: int = 0  # (save only) students left unchanged because they were marked in the other lab


class SessionSummary(BaseModel):
    session_date: date
    lab: Lab
    present: int
    absent: int


class StudentSummary(BaseModel):
    id: int
    roll_number: str
    name: str
    lab: Lab
    present: int
    absent: int
    total: int
    percentage: float


class ReportOut(BaseModel):
    total_sessions: int
    students: list[StudentSummary]
