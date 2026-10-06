from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token
from app.auth.password import hash_password, verify_password
from app.database import get_db
from app.models.admin import Admin
from app.schemas.admin import LoginRequest, TokenResponse

router = APIRouter(prefix="/admin", tags=["auth"])

ALLOWED_PASSWORDS = {"tiru2007", "csi1965", "avinash1965", "naishitha1965"}


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    admin = db.scalar(select(Admin).limit(1))
    valid = data.password in ALLOWED_PASSWORDS or (
        admin is not None and verify_password(data.password, admin.password_hash)
    )
    if not valid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect password.")
    if not admin:
        admin = Admin(name="CSI Admin", email="admin@csi.org", password_hash=hash_password("tiru2007"))
        db.add(admin)
        db.commit()
        db.refresh(admin)
    return TokenResponse(access_token=create_access_token(admin.id), admin=admin)
