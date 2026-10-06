import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Lab = Literal["Lab 1", "Lab 2"]

_REG_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")


def _squash(v):
    return " ".join(v.split()) if isinstance(v, str) else v


class StudentIn(BaseModel):
    """Used to add a student (lab defaults to Lab 1)."""
    roll_number: str = Field(min_length=1, max_length=30)  # registration number
    name: str = Field(min_length=1, max_length=100)
    lab: Lab = "Lab 1"

    @field_validator("roll_number", "name", mode="before")
    @classmethod
    def strip_text(cls, v):
        return _squash(v)

    @field_validator("roll_number")
    @classmethod
    def check_reg(cls, v: str) -> str:
        if not _REG_RE.match(v):
            raise ValueError("Registration number can only contain letters, numbers and - _ . /")
        return v


class StudentUpdate(BaseModel):
    """Used to edit a student. Leave `lab` out to keep the current lab."""
    roll_number: str = Field(min_length=1, max_length=30)
    name: str = Field(min_length=1, max_length=100)
    lab: Lab | None = None

    @field_validator("roll_number", "name", mode="before")
    @classmethod
    def strip_text(cls, v):
        return _squash(v)

    @field_validator("roll_number")
    @classmethod
    def check_reg(cls, v: str) -> str:
        if not _REG_RE.match(v):
            raise ValueError("Registration number can only contain letters, numbers and - _ . /")
        return v


class LabChange(BaseModel):
    lab: Lab


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    roll_number: str
    name: str
    lab: Lab


class BulkItem(BaseModel):
    """Loose on purpose: each line is checked separately so one bad line doesn't block the others."""
    roll_number: str = ""
    name: str = ""
    lab: str = "Lab 1"


class StudentBulk(BaseModel):
    students: list[BulkItem] = Field(min_length=1, max_length=500)


class BulkProblem(BaseModel):
    roll_number: str
    reason: str


class BulkResult(BaseModel):
    created: int
    skipped: list[str]  # registration numbers that already existed (or repeated in the paste)
    rejected: list[BulkProblem]  # lines that were invalid
