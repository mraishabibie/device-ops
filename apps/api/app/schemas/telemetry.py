import datetime
import uuid
from pydantic import BaseModel, Field, ConfigDict


class GPSLogCreate(BaseModel):
    id: uuid.UUID
    latitude: float
    longitude: float
    accuracy: float | None = None
    recorded_at: datetime.datetime


class BatteryLogCreate(BaseModel):
    id: uuid.UUID
    battery_level: int = Field(..., ge=0, le=100)
    charging: bool
    recorded_at: datetime.datetime


class NetworkLogCreate(BaseModel):
    id: uuid.UUID
    network_type: str = Field(..., max_length=20)
    is_online: bool
    recorded_at: datetime.datetime


class TelemetrySyncRequest(BaseModel):
    gps_logs: list[GPSLogCreate] = []
    battery_logs: list[BatteryLogCreate] = []
    network_logs: list[NetworkLogCreate] = []


class PairingTokenResponse(BaseModel):
    id: uuid.UUID
    token: str
    expires_at: datetime.datetime
    created_at: datetime.datetime


class DevicePairRequest(BaseModel):
    token: str = Field(..., max_length=255)
    android_version: str = Field(..., max_length=30)
    app_version: str = Field(..., max_length=30)


# ==========================================
# MILESTONE D: HISTORY & DASHBOARD SCHEMAS
# ==========================================

class GPSLogResponse(BaseModel):
    id: uuid.UUID
    latitude: float
    longitude: float
    accuracy: float | None
    recorded_at: datetime.datetime
    synced_at: datetime.datetime | None

    model_config = ConfigDict(from_attributes=True)


class GPSHistoryResponse(BaseModel):
    items: list[GPSLogResponse]
    total: int
    page: int
    size: int


class BatteryLogResponse(BaseModel):
    id: uuid.UUID
    battery_level: int
    charging: bool
    recorded_at: datetime.datetime
    synced_at: datetime.datetime | None

    model_config = ConfigDict(from_attributes=True)


class BatteryHistoryResponse(BaseModel):
    items: list[BatteryLogResponse]
    total: int
    page: int
    size: int


class NetworkLogResponse(BaseModel):
    id: uuid.UUID
    network_type: str
    is_online: bool
    recorded_at: datetime.datetime
    synced_at: datetime.datetime | None

    model_config = ConfigDict(from_attributes=True)


class NetworkHistoryResponse(BaseModel):
    items: list[NetworkLogResponse]
    total: int
    page: int
    size: int


class DashboardStatsResponse(BaseModel):
    total_devices: int
    online_devices: int
    offline_devices: int
    pending_sync_devices: int


class RecentActivityItem(BaseModel):
    id: str
    device_name: str
    action: str
    timestamp: datetime.datetime


class RecentActivityResponse(BaseModel):
    items: list[RecentActivityItem]
