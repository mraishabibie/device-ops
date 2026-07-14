import pytest
from pydantic import ValidationError
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse


def test_device_type_validation_success():
    schema = DeviceCreate(
        device_name="Test Phone",
        serial_number="SN-12345",
        device_type="PHONE",
        department="Logistics"
    )
    assert schema.device_type == "PHONE"

    schema = DeviceCreate(
        device_name="Test Tablet",
        serial_number="SN-54321",
        device_type="TABLET"
    )
    assert schema.device_type == "TABLET"


def test_device_type_validation_failure():
    # Only PHONE and TABLET are allowed
    with pytest.raises(ValidationError):
        DeviceCreate(
            device_name="Test PC",
            serial_number="SN-9999",
            device_type="DESKTOP"
        )


def test_device_status_validation_success():
    schema = DeviceUpdate(status="ONLINE")
    assert schema.status == "ONLINE"

    schema = DeviceUpdate(status="OFFLINE")
    assert schema.status == "OFFLINE"

    schema = DeviceUpdate(status="PENDING_SYNC")
    assert schema.status == "PENDING_SYNC"


def test_device_status_validation_failure():
    with pytest.raises(ValidationError):
        DeviceUpdate(status="UNKNOWN")


def test_device_update_serial_immutability():
    # DeviceUpdate should not include serial_number
    schema = DeviceUpdate(device_name="New Name")
    assert not hasattr(schema, "serial_number")
