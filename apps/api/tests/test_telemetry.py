import pytest
from pydantic import ValidationError
from app.schemas.telemetry import GPSLogCreate, BatteryLogCreate, NetworkLogCreate, TelemetrySyncRequest
import uuid
from datetime import datetime, timezone


def test_telemetry_gps_schema_success():
    log_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    schema = GPSLogCreate(
        id=log_id,
        latitude=45.1234567,
        longitude=-73.9876543,
        accuracy=5.5,
        recorded_at=now
    )
    assert schema.id == log_id
    assert schema.latitude == 45.1234567
    assert schema.accuracy == 5.5


def test_telemetry_battery_schema_success():
    log_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    schema = BatteryLogCreate(
        id=log_id,
        battery_level=85,
        charging=True,
        recorded_at=now
    )
    assert schema.battery_level == 85
    assert schema.charging is True


def test_telemetry_battery_schema_failure():
    # battery_level must be between 0 and 100
    log_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    with pytest.raises(ValidationError):
        BatteryLogCreate(
            id=log_id,
            battery_level=120, # Invalid level
            charging=False,
            recorded_at=now
        )

    with pytest.raises(ValidationError):
        BatteryLogCreate(
            id=log_id,
            battery_level=-5, # Invalid level
            charging=False,
            recorded_at=now
        )


def test_telemetry_network_schema_success():
    log_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    schema = NetworkLogCreate(
        id=log_id,
        network_type="WIFI",
        is_online=True,
        recorded_at=now
    )
    assert schema.network_type == "WIFI"
    assert schema.is_online is True
