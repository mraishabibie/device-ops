import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CompanyBase(BaseModel):
    name: str = Field(..., max_length=150)
    slug: str = Field(..., max_length=100)
    contact_email: str | None = Field(None, max_length=150)
    website: str | None = Field(None, max_length=150)
    support_phone: str | None = Field(None, max_length=50)
    logo_url: str | None = Field(None, max_length=255)
    timezone: str = "UTC"
    date_format: str = "YYYY-MM-DD"

    @field_validator("website")
    @classmethod
    def validate_website(cls, v: str | None) -> str | None:
        if v is not None and v != "":
            if not v.startswith("https://"):
                raise ValueError("Website must be a valid HTTPS URL starting with https://")
        return v


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(None, max_length=150)
    slug: str | None = Field(None, max_length=100)
    contact_email: str | None = Field(None, max_length=150)
    website: str | None = Field(None, max_length=150)
    support_phone: str | None = Field(None, max_length=50)
    logo_url: str | None = Field(None, max_length=255)
    timezone: str | None = None
    date_format: str | None = None

    @field_validator("website")
    @classmethod
    def validate_website(cls, v: str | None) -> str | None:
        if v is not None and v != "":
            if not v.startswith("https://"):
                raise ValueError("Website must be a valid HTTPS URL starting with https://")
        return v


class CompanyResponse(CompanyBase):
    id: uuid.UUID
    status: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
