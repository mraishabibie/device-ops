import logging
from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.core.config import settings

logger = logging.getLogger("deviceops.auth_service")


class AuthService:
    """Service to handle cryptographic operations including Argon2 hashing and JWT management"""
    def __init__(self):
        self.ph = PasswordHasher()

    def hash_password(self, password: str) -> str:
        """Hash a raw password string using Argon2"""
        return self.ph.hash(password)

    def verify_password(self, password_hash: str, password: str) -> bool:
        """Verify a password against an Argon2 hash"""
        try:
            return self.ph.verify(password_hash, password)
        except VerifyMismatchError:
            return False
        except Exception as e:
            logger.error(f"Unexpected password verification failure: {e}")
            return False

    def create_token(self, subject: str | Any, expires_delta: timedelta, token_type: str) -> str:
        """Generate a signed JWT token containing a subject and expiry threshold"""
        expire = datetime.now(timezone.utc) + expires_delta
        payload = {
            "sub": str(subject),
            "exp": int(expire.timestamp()),
            "type": token_type
        }
        encoded_jwt = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
        return encoded_jwt

    def create_access_token(self, subject: str | Any) -> str:
        """Create a short-lived access token"""
        return self.create_token(
            subject=subject,
            expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
            token_type="access"
        )

    def create_refresh_token(self, subject: str | Any) -> str:
        """Create a longer-lived refresh token"""
        # Refresh tokens default to 7 days lifespan
        return self.create_token(
            subject=subject,
            expires_delta=timedelta(days=7),
            token_type="refresh"
        )

    def decode_token(self, token: str) -> dict[str, Any] | None:
        """Decode a JWT token, verifying signature and expiry status"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token verification failed: Token has expired.")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Token verification failed: {e}")
            return None


auth_service = AuthService()
