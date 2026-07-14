import pytest
from app.services.auth import auth_service


def test_password_hashing():
    password = "secret_password_123"
    hashed = auth_service.hash_password(password)
    assert hashed != password
    assert auth_service.verify_password(hashed, password) is True
    assert auth_service.verify_password(hashed, "wrong_password") is False


def test_jwt_lifecycle():
    user_id = "12345678-1234-1234-1234-123456789012"
    token = auth_service.create_access_token(user_id)
    decoded = auth_service.decode_token(token)
    assert decoded is not None
    assert decoded["sub"] == user_id
    assert decoded["type"] == "access"
