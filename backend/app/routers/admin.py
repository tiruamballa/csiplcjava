from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_admin
from app.database import get_db
from app.models.admin import Admin
from app.models.assignment import Assignment
from app.schemas.admin import AdminOut
from app.schemas.assignment import AssignmentOut

# login lives in routers/auth.py (public); everything here needs a valid JWT.
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


@router.get("/me", response_model=AdminOut)
def me(admin: Admin = Depends(get_current_admin)):
    return admin


@router.get("/assignments", response_model=list[AssignmentOut])
def list_all_assignments(db: Session = Depends(get_db)):
    """Every assignment, including ones scheduled for future dates (public API hides those)."""
    stmt = select(Assignment).order_by(Assignment.day_number.desc(), Assignment.id.asc())
    return db.scalars(stmt).all()
