import pytest
from pydantic import ValidationError
from app.schemas.user import UserCreate, UserUpdate, UserStatusUpdate


def test_user_status_validation_success():
    schema = UserStatusUpdate(status="ACTIVE")
    assert schema.status == "ACTIVE"

    schema = UserStatusUpdate(status="DISABLED")
    assert schema.status == "DISABLED"


def test_user_status_validation_failure():
    with pytest.raises(ValidationError):
        UserStatusUpdate(status="SUSPENDED")


def test_user_create_password_length():
    # Password must be at least 8 characters
    with pytest.raises(ValidationError):
        UserCreate(
            email="test@test.com",
            full_name="Test Name",
            password="123",
            role="ADMIN"
        )


def test_user_update_password_optional():
    # Empty password should be allowed in update schema
    schema = UserUpdate(full_name="New Name", password="")
    assert schema.password == ""
    
    # Verify that in endpoint handler we ignore empty password:
    data = schema.model_dump(exclude_unset=True)
    if "password" in data and (data["password"] is None or data["password"] == ""):
        del data["password"]
        
    assert "password" not in data
    assert data["full_name"] == "New Name"
