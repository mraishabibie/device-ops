import datetime
import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator


class DeviceCreate(BaseModel):
    device_name: str = Field(..., max_length=100)
    serial_number: str = Field(..., max_length=150)
    device_type: str = "PHONE" # PHONE/TABLET
    department: str | None = Field(None, max_length=100)

    @field_validator("device_type")
    @classmethod
    def validate_device_type(cls, v: str) -> str:
        if v not in ["PHONE", "TABLET"]:
            raise ValueError("Device type must be either PHONE or TABLET")
        return v


class DeviceUpdate(BaseModel):
    device_name: str | None = Field(None, max_length=100)
    department: str | None = Field(None, max_length=100)
    status: str | None = None # ONLINE/OFFLINE/PENDING_SYNC

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None and v not in ["ONLINE", "OFFLINE", "PENDING_SYNC"]:
            raise ValueError("Status must be ONLINE, OFFLINE, or PENDING_SYNC")
        return v


class DeviceResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    device_name: str
    serial_number: str
    android_version: str | None = None
    app_version: str | None = None
    department: str | None = None
    device_type: str
    pairing_status: str # UNPAIRED/PAIRING/PAIRED
    status: str # ONLINE/OFFLINE/PENDING_SYNC
    last_sync_at: datetime.datetime | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class DeviceListResponse(BaseModel):
    items: list[DeviceResponse]
    total: int
    page: int
    size: int
