import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, RefreshRequest
from app.services.auth import auth_service
from app.services.user import user_service

logger = logging.getLogger("deviceops.auth_api")
router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticates credentials and returns access and refresh tokens"""
    user = await user_service.get_user_by_email(db, login_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
        
    # Verify password hash using Argon2
    is_valid = auth_service.verify_password(user.password_hash, login_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
        
    # Check user account status
    if user.status != "ACTIVE" or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or disabled"
        )
        
    # Generate token payload
    access_token = auth_service.create_access_token(subject=user.id)
    refresh_token = auth_service.create_refresh_token(subject=user.id)
    
    # Audit log update for login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verifies refresh token and returns a new access token"""
    payload = auth_service.decode_token(refresh_data.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
        
    user_id_str = payload.get("sub")
    token_type = payload.get("type")
    
    if not user_id_str or token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
        
    user = await user_service.get_user(db, user_id_str)
    if not user or user.status != "ACTIVE" or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or disabled"
        )
        
    # Generate new access token
    new_access_token = auth_service.create_access_token(subject=user.id)
    # Return new access token along with the same refresh token
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=refresh_data.refresh_token
    )


@router.post("/logout")
async def logout():
    """Logs out current session (stateless)"""
    return {"success": True, "message": "Logged out successfully"}
