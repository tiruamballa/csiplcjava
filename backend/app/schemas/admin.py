from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class AdminOut(BaseModel):
    """Public view of an admin. Deliberately has NO password_hash field."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut
