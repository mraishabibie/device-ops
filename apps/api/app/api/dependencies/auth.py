import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from app.models.company import Company
from app.services.auth import auth_service
from app.services.user import user_service
from app.services.company import company_service

# Token URL endpoint for Swagger OAuth login workflow integrations
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Decodes JWT, retrieves user, and validates status"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = auth_service.decode_token(token)
    if not payload:
        raise credentials_exception
        
    user_id_str: str | None = payload.get("sub")
    token_type: str | None = payload.get("type")
    
    if not user_id_str or token_type != "access":
        raise credentials_exception
        
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception
        
    user = await user_service.get_user(db, user_id)
    if not user:
        raise credentials_exception
        
    # Enforce User Status Validation: disabled or soft-deleted users cannot authenticate
    if user.status != "ACTIVE" or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or disabled"
        )
        
    return user


async def get_current_active_company(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Company:
    """Retrieves the authenticated user's workspace (company) context"""
    company = await company_service.get_company(db, current_user.company_id)
    if not company or company.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated company workspace not found"
        )
        
    # Per user refinement, we skip active/suspended status checking on the Company for the MVP,
    # focusing only on verifying user eligibility and providing the tenant isolation context.
    return company


async def get_current_device(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Device:
    """Decodes JWT and retrieves device context. Validates it is active and paired."""
    from sqlalchemy import select
    from app.models.device import Device

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate device credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = auth_service.decode_token(token)
    if not payload:
        raise credentials_exception
        
    device_id_str: str | None = payload.get("sub")
    token_type: str | None = payload.get("type")
    
    # Enforce type = "device" for paired devices (refinement 5)
    if not device_id_str or token_type != "device":
        raise credentials_exception
        
    try:
        device_id = uuid.UUID(device_id_str)
    except ValueError:
        raise credentials_exception
        
    # Fetch device
    query = select(Device).where(Device.id == device_id)
    result = await db.execute(query)
    device = result.scalar_one_or_none()
    
    if not device:
        raise credentials_exception
        
    # Refinement 2: soft-deleted or unpaired devices reject telemetry and future handshakes
    if device.deleted_at is not None or device.pairing_status != "PAIRED":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device is decommissioned or unpaired"
        )
        
    return device

