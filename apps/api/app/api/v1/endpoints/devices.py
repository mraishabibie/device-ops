import logging
from datetime import datetime, timezone, timedelta
import secrets
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user, get_current_active_company, get_current_device
from app.models.user import User
from app.models.company import Company
from app.models.device import Device
from app.models.pairing import PairingToken
from app.models.log import GPSLog, BatteryLog, NetworkLog
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceListResponse
from app.schemas.telemetry import (
    TelemetrySyncRequest,
    PairingTokenResponse,
    DevicePairRequest,
    GPSHistoryResponse,
    BatteryHistoryResponse,
    NetworkHistoryResponse
)
from app.services.auth import auth_service

logger = logging.getLogger("deviceops.device_api")
router = APIRouter()


@router.get("/", response_model=DeviceListResponse)
async def list_devices(
    search: str | None = None,
    status_filter: str | None = None,
    device_type: str | None = None,
    department: str | None = None,
    page: int = 1,
    size: int = 10,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve a paginated, searchable, and filtered list of active devices (excludes decommissioned devices)"""
    if page < 1:
        page = 1
    if size < 1:
        size = 10
        
    skip = (page - 1) * size

    base_filter = [Device.company_id == company.id, Device.deleted_at.is_(None)]

    if search:
        search_term = f"%{search.strip().lower()}%"
        base_filter.append(
            or_(
                func.lower(Device.device_name).like(search_term),
                func.lower(Device.serial_number).like(search_term)
            )
        )

    if status_filter:
        base_filter.append(Device.status == status_filter)

    if device_type:
        base_filter.append(Device.device_type == device_type)

    if department:
        base_filter.append(Device.department == department)

    count_query = select(func.count(Device.id)).where(*base_filter)
    count_result = await db.execute(count_query)
    total = count_result.scalar_one_or_none() or 0

    select_query = select(Device).where(*base_filter).order_by(Device.created_at.desc()).offset(skip).limit(size)
    items_result = await db.execute(select_query)
    items = items_result.scalars().all()

    return DeviceListResponse(
        items=list(items),
        total=total,
        page=page,
        size=size
    )


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device_details(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details for a single active device. Excludes decommissioned devices."""
    query = select(Device).where(
        Device.id == device_id,
        Device.company_id == company.id,
        Device.deleted_at.is_(None)
    )
    result = await db.execute(query)
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or decommissioned"
        )
        
    return device


@router.post("/", response_model=DeviceResponse)
async def register_device(
    device_in: DeviceCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Register a new device in the active company workspace. Enforces name uniqueness constraints."""
    if current_user.role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to register devices"
        )

    name_clean = device_in.device_name.strip()
    query_name = select(Device).where(
        Device.company_id == company.id,
        Device.device_name == name_clean,
        Device.deleted_at.is_(None)
    )
    dup_name = await db.execute(query_name)
    if dup_name.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A device with this name is already registered in your workspace"
        )

    serial_clean = device_in.serial_number.strip()
    query_serial = select(Device).where(
        Device.serial_number == serial_clean,
        Device.deleted_at.is_(None)
    )
    dup_serial = await db.execute(query_serial)
    if dup_serial.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A device with this serial number is already registered in the system"
        )

    new_device = Device(
        company_id=company.id,
        device_name=name_clean,
        serial_number=serial_clean,
        device_type=device_in.device_type,
        department=device_in.department,
        pairing_status="UNPAIRED",
        status="PENDING_SYNC"
    )
    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)

    logger.info(
        f"Device Created. CompanyID: {company.id}, "
        f"ActorUserID: {current_user.id}, "
        f"TargetDeviceID: {new_device.id}, "
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
    )

    return new_device


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: uuid.UUID,
    device_in: DeviceUpdate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Update active device details. Excludes decommissioned devices. Serial number remains immutable."""
    if current_user.role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify devices"
        )

    query = select(Device).where(
        Device.id == device_id,
        Device.company_id == company.id
    )
    result = await db.execute(query)
    device = result.scalar_one_or_none()

    if not device or device.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or decommissioned"
        )

    update_data = device_in.model_dump(exclude_unset=True)

    if "device_name" in update_data and update_data["device_name"]:
        name_clean = update_data["device_name"].strip()
        if name_clean != device.device_name:
            query_name = select(Device).where(
                Device.company_id == company.id,
                Device.device_name == name_clean,
                Device.id != device.id,
                Device.deleted_at.is_(None)
            )
            dup_name = await db.execute(query_name)
            if dup_name.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A device with this name is already registered in your workspace"
                )
            update_data["device_name"] = name_clean

    for field, value in update_data.items():
        if hasattr(device, field):
            setattr(device, field, value)

    await db.commit()
    await db.refresh(device)

    logger.info(
        f"Device Updated. CompanyID: {company.id}, "
        f"ActorUserID: {current_user.id}, "
        f"TargetDeviceID: {device.id}, "
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
    )

    return device


@router.delete("/{device_id}", response_model=DeviceResponse)
async def decommission_device(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Decommission (soft delete) a device. Sets deleted_at timestamp."""
    if current_user.role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to decommission devices"
        )

    query = select(Device).where(
        Device.id == device_id,
        Device.company_id == company.id
    )
    result = await db.execute(query)
    device = result.scalar_one_or_none()

    if not device or device.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or already decommissioned"
        )

    device.deleted_at = datetime.now(timezone.utc)
    device.pairing_status = "UNPAIRED"
    device.status = "OFFLINE"
    
    await db.commit()
    await db.refresh(device)

    logger.info(
        f"Device Deleted. CompanyID: {company.id}, "
        f"ActorUserID: {current_user.id}, "
        f"TargetDeviceID: {device.id}, "
        f"Timestamp: {datetime.now(timezone.utc).isoformat()}"
    )

    return device


# ==========================================
# MILESTONE C: PAIRING & TELEMETRY ROUTES
# ==========================================

@router.post("/{device_id}/pair-token", response_model=PairingTokenResponse)
async def generate_pairing_token(
    device_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Generate a one-time random pairing token valid for 10 minutes."""
    if current_user.role == "VIEWER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to generate pairing tokens"
        )

    # Fetch device, enforcing tenant isolation
    query = select(Device).where(
        Device.id == device_id,
        Device.company_id == company.id
    )
    result = await db.execute(query)
    device = result.scalar_one_or_none()

    # Refinement 2: soft-deleted devices must reject pairing token generation
    if not device or device.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or decommissioned"
        )

    if device.pairing_status == "PAIRED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device is already paired"
        )

    token = secrets.token_hex(16)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    pairing_token = PairingToken(
        company_id=company.id,
        device_id=device.id,
        token=token,
        expires_at=expires_at
    )
    db.add(pairing_token)
    await db.commit()
    await db.refresh(pairing_token)

    return pairing_token


@router.post("/pair")
async def pair_android_agent(
    pair_in: DevicePairRequest,
    db: AsyncSession = Depends(get_db)
):
    """Public endpoint called by the Android agent client to activate pairing."""
    # Find matching token
    query_token = select(PairingToken).where(PairingToken.token == pair_in.token)
    token_result = await db.execute(query_token)
    pairing_token = token_result.scalar_one_or_none()

    if not pairing_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pairing token"
        )

    if pairing_token.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pairing token has already been used"
        )

    if pairing_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pairing token has expired"
        )

    # Fetch target device
    query_device = select(Device).where(Device.id == pairing_token.device_id)
    device_result = await db.execute(query_device)
    device = device_result.scalar_one_or_none()

    # Refinement 2: soft-deleted devices must reject pairing attempts
    if not device or device.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target device not found or decommissioned"
        )

    # Update state
    now_utc = datetime.now(timezone.utc)
    pairing_token.used_at = now_utc
    
    device.pairing_status = "PAIRED"
    device.status = "ONLINE"
    device.android_version = pair_in.android_version
    device.app_version = pair_in.app_version
    device.last_sync_at = now_utc

    db.add(pairing_token)
    db.add(device)
    await db.commit()

    # Refinement 5: Generate long-lived JWT token of dedicated type "device"
    device_token = auth_service.create_token(
        subject=device.id,
        expires_delta=timedelta(days=3650), # 10 years
        token_type="device"
    )

    logger.info(
        f"Device Paired Successfully. CompanyID: {device.company_id}, "
        f"TargetDeviceID: {device.id}, "
        f"Timestamp: {now_utc.isoformat()}"
    )

    return {
        "access_token": device_token,
        "token_type": "bearer"
    }


@router.post("/telemetry")
async def upload_telemetry(
    payload: TelemetrySyncRequest,
    device: Device = Depends(get_current_device),
    db: AsyncSession = Depends(get_db)
):
    """Secure endpoint called by paired Android devices to synchronize batch telemetry data.

    Enforces:
    - Idempotency via database primary key conflicts mapping (ON CONFLICT DO NOTHING).
    - Time tracking storing both device-side recorded_at and server-side synced_at timestamps.
    """
    now_utc = datetime.now(timezone.utc)
    gps_inserted = 0
    battery_inserted = 0
    network_inserted = 0

    # 1. Process GPS Logs
    for log in payload.gps_logs:
        stmt = insert(GPSLog).values(
            id=log.id,
            company_id=device.company_id,
            device_id=device.id,
            latitude=log.latitude,
            longitude=log.longitude,
            accuracy=log.accuracy,
            recorded_at=log.recorded_at,
            synced_at=now_utc  # server timestamp (Refinement 1)
        ).on_conflict_do_nothing(index_elements=['id']) # Idempotency check (Refinement 2)
        res = await db.execute(stmt)
        if res.rowcount > 0:
            gps_inserted += 1

    # 2. Process Battery Logs
    for log in payload.battery_logs:
        stmt = insert(BatteryLog).values(
            id=log.id,
            company_id=device.company_id,
            device_id=device.id,
            battery_level=log.battery_level,
            charging=log.charging,
            recorded_at=log.recorded_at,
            synced_at=now_utc
        ).on_conflict_do_nothing(index_elements=['id'])
        res = await db.execute(stmt)
        if res.rowcount > 0:
            battery_inserted += 1

    # 3. Process Network Logs
    for log in payload.network_logs:
        stmt = insert(NetworkLog).values(
            id=log.id,
            company_id=device.company_id,
            device_id=device.id,
            network_type=log.network_type,
            is_online=log.is_online,
            recorded_at=log.recorded_at,
            synced_at=now_utc
        ).on_conflict_do_nothing(index_elements=['id'])
        res = await db.execute(stmt)
        if res.rowcount > 0:
            network_inserted += 1

    # Update Device connectivity parameters
    device.last_sync_at = now_utc
    
    # Resolve latest network online state to update device status
    if payload.network_logs:
        latest_network_log = max(payload.network_logs, key=lambda l: l.recorded_at)
        device.status = "ONLINE" if latest_network_log.is_online else "OFFLINE"

    db.add(device)
    await db.commit()

    logger.debug(
        f"Telemetry Synchronization Completed. DeviceID: {device.id}, "
        f"GPS: {gps_inserted}/{len(payload.gps_logs)}, "
        f"Battery: {battery_inserted}/{len(payload.battery_logs)}, "
        f"Network: {network_inserted}/{len(payload.network_logs)}"
    )

    return {
        "success": True,
        "gps_synced": gps_inserted,
        "battery_synced": battery_inserted,
        "network_synced": network_inserted
    }


@router.get("/{device_id}/gps-history", response_model=GPSHistoryResponse)
async def get_device_gps_history(
    device_id: uuid.UUID,
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve paginated GPS location records for an active device (tenant-isolated)."""
    query_device = select(Device).where(
        Device.id == device_id,
        Device.company_id == company.id,
        Device.deleted_at.is_(None)
    )
    dev_res = await db.execute(query_device)
    if not dev_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or decommissioned"
        )

    if page < 1:
        page = 1
    if size < 1:
        size = 20
    skip = (page - 1) * size

    count_query = select(func.count(GPSLog.id)).where(GPSLog.device_id == device_id)
    count_res = await db.execute(count_query)
    total = count_res.scalar_one_or_none() or 0

    select_query = select(GPSLog).where(GPSLog.device_id == device_id).order_by(GPSLog.recorded_at.desc()).offset(skip).limit(size)
    items_res = await db.execute(select_query)
    items = items_res.scalars().all()

    return GPSHistoryResponse(
        items=list(items),
        total=total,
        page=page,
        size=size
    )


@router.get("/{device_id}/battery-history", response_model=BatteryHistoryResponse)
async def get_device_battery_history(
    device_id: uuid.UUID,
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve paginated battery level records for an active device (tenant-isolated)."""
    query_device = select(Device).where(
        Device.id == device_id,
        Device.company_id == company.id,
        Device.deleted_at.is_(None)
    )
    dev_res = await db.execute(query_device)
    if not dev_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or decommissioned"
        )

    if page < 1:
        page = 1
    if size < 1:
        size = 20
    skip = (page - 1) * size

    count_query = select(func.count(BatteryLog.id)).where(BatteryLog.device_id == device_id)
    count_res = await db.execute(count_query)
    total = count_res.scalar_one_or_none() or 0

    select_query = select(BatteryLog).where(BatteryLog.device_id == device_id).order_by(BatteryLog.recorded_at.desc()).offset(skip).limit(size)
    items_res = await db.execute(select_query)
    items = items_res.scalars().all()

    return BatteryHistoryResponse(
        items=list(items),
        total=total,
        page=page,
        size=size
    )


@router.get("/{device_id}/network-history", response_model=NetworkHistoryResponse)
async def get_device_network_history(
    device_id: uuid.UUID,
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve paginated network connectivity records for an active device (tenant-isolated)."""
    query_device = select(Device).where(
        Device.id == device_id,
        Device.company_id == company.id,
        Device.deleted_at.is_(None)
    )
    dev_res = await db.execute(query_device)
    if not dev_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found or decommissioned"
        )

    if page < 1:
        page = 1
    if size < 1:
        size = 20
    skip = (page - 1) * size

    count_query = select(func.count(NetworkLog.id)).where(NetworkLog.device_id == device_id)
    count_res = await db.execute(count_query)
    total = count_res.scalar_one_or_none() or 0

    select_query = select(NetworkLog).where(NetworkLog.device_id == device_id).order_by(NetworkLog.recorded_at.desc()).offset(skip).limit(size)
    items_res = await db.execute(select_query)
    items = items_res.scalars().all()

    return NetworkHistoryResponse(
        items=list(items),
        total=total,
        page=page,
        size=size
    )
