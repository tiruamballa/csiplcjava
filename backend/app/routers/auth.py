from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token
from app.auth.password import DUMMY_HASH, verify_password
from app.database import get_db
from app.models.admin import Admin
from app.schemas.admin import LoginRequest, TokenResponse

router = APIRouter(prefix="/admin", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    admin = db.scalar(select(Admin).where(Admin.email == data.email.lower()))
    # Always run a bcrypt verify so response time doesn't reveal whether the email exists.
    valid = verify_password(data.password, admin.password_hash if admin else DUMMY_HASH)
    if not admin or not valid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    return TokenResponse(access_token=create_access_token(admin.id), admin=admin)
