from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class UserLoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserCreateRequest(BaseModel):
    email: str = Field(..., description="User email address")
    full_name: Optional[str] = None
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    role: str = Field(default="member", description="User role: admin, member, or viewer")
    is_active: bool = True

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
