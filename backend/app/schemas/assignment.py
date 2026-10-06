from datetime import date, datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

Difficulty = Literal["Easy", "Medium", "Hard"]


class AssignmentBase(BaseModel):
    day_number: int = Field(ge=1, le=1000)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    difficulty: Difficulty
    question_link: str = Field(max_length=500)
    assignment_date: date

    @field_validator("title", "description", "question_link", mode="before")
    @classmethod
    def strip_text(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("question_link")
    @classmethod
    def validate_link(cls, v: str) -> str:
        parsed = urlparse(v)
        if parsed.scheme not in ("http", "https") or not parsed.netloc or " " in v:
            raise ValueError("Enter a valid link starting with http:// or https://")
        return v


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentUpdate(AssignmentBase):
    pass


class AssignmentOut(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class TodayOut(BaseModel):
    day_number: int | None
    assignment_date: date | None
    assignments: list[AssignmentOut]
