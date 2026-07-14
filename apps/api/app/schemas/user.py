import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserBase(BaseModel):
    email: str = Field(..., max_length=150)
    full_name: str = Field(..., max_length=150)
    role: str = "ADMIN" # OWNER/ADMIN/VIEWER


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: str | None = Field(None, max_length=150)
    full_name: str | None = Field(None, max_length=150)
    role: str | None = None
    password: str | None = Field(None) # refinement 3: empty/None password must not overwrite


class UserResponse(UserBase):
    id: uuid.UUID
    company_id: uuid.UUID
    status: str
    last_login_at: datetime.datetime | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class UserStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ["ACTIVE", "DISABLED"]:
            raise ValueError("Status must be either ACTIVE or DISABLED")
        return v


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    size: int
