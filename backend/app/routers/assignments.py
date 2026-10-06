from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_admin
from app.config import today_local
from app.database import get_db
from app.models.assignment import Assignment
from app.schemas.assignment import AssignmentCreate, AssignmentOut, AssignmentUpdate, TodayOut

router = APIRouter(prefix="/assignments", tags=["assignments"])


def _published():
    """Public visibility rule: an assignment goes live on its assignment_date."""
    return Assignment.assignment_date <= today_local()


def _ensure_unique(db: Session, day: int, title: str, exclude_id: int | None = None):
    stmt = select(Assignment.id).where(
        Assignment.day_number == day, func.lower(Assignment.title) == title.lower()
    )
    if exclude_id is not None:
        stmt = stmt.where(Assignment.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f'"{title}" is already added for Day {day}.'
        )


# ---------------------------- Public (no login) ----------------------------

@router.get("", response_model=list[AssignmentOut])
def list_assignments(db: Session = Depends(get_db)):
    stmt = (
        select(Assignment)
        .where(_published())
        .order_by(Assignment.day_number.desc(), Assignment.id.asc())
    )
    return db.scalars(stmt).all()


@router.get("/today", response_model=TodayOut)
def today_assignments(db: Session = Depends(get_db)):
    """Latest day whose date has arrived."""
    day = db.scalar(select(func.max(Assignment.day_number)).where(_published()))
    if day is None:
        return TodayOut(day_number=None, assignment_date=None, assignments=[])
    items = db.scalars(
        select(Assignment)
        .where(_published(), Assignment.day_number == day)
        .order_by(Assignment.id.asc())
    ).all()
    return TodayOut(day_number=day, assignment_date=items[0].assignment_date, assignments=items)


@router.get("/day/{day_number}", response_model=list[AssignmentOut])
def assignments_for_day(day_number: int, db: Session = Depends(get_db)):
    items = db.scalars(
        select(Assignment)
        .where(_published(), Assignment.day_number == day_number)
        .order_by(Assignment.id.asc())
    ).all()
    if not items:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No assignments found for Day {day_number}.")
    return items


@router.get("/{assignment_id}", response_model=AssignmentOut)
def get_assignment(assignment_id: int, db: Session = Depends(get_db)):
    item = db.scalar(select(Assignment).where(Assignment.id == assignment_id, _published()))
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found.")
    return item


# ------------------------- Admin only (valid JWT) --------------------------

@router.post(
    "",
    response_model=AssignmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
def create_assignment(data: AssignmentCreate, db: Session = Depends(get_db)):
    _ensure_unique(db, data.day_number, data.title)
    item = Assignment(**data.model_dump())
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This assignment already exists.")
    db.refresh(item)
    return item


@router.put(
    "/{assignment_id}", response_model=AssignmentOut, dependencies=[Depends(get_current_admin)]
)
def update_assignment(assignment_id: int, data: AssignmentUpdate, db: Session = Depends(get_db)):
    item = db.get(Assignment, assignment_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found.")
    _ensure_unique(db, data.day_number, data.title, exclude_id=assignment_id)
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "This assignment already exists.")
    db.refresh(item)
    return item


@router.delete(
    "/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_admin)]
)
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    item = db.get(Assignment, assignment_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found.")
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
