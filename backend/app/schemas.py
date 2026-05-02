from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
    user_email: EmailStr


class S3ObjectResult(BaseModel):
    key: str
    size_bytes: int
    last_modified: datetime | None
    hour: int | None
    download_url: str
