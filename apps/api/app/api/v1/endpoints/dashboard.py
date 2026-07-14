import logging
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.dependencies.auth import get_current_user, get_current_active_company
from app.models.user import User
from app.models.company import Company
from app.models.device import Device
from app.models.log import BatteryLog, NetworkLog
from app.schemas.telemetry import DashboardStatsResponse, RecentActivityResponse, RecentActivityItem

logger = logging.getLogger("deviceops.dashboard_api")
router = APIRouter()


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_statistics(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve operational device statistics for the active company dashboard (tenant-isolated)."""
    # 1. Total devices count (Refinement: Calculated only from active devices)
    q_total = select(func.count(Device.id)).where(
        Device.company_id == company.id,
        Device.deleted_at.is_(None)
    )
    res_total = await db.execute(q_total)
    total_count = res_total.scalar_one_or_none() or 0

    # 2. Online devices count
    q_online = select(func.count(Device.id)).where(
        Device.company_id == company.id,
        Device.deleted_at.is_(None),
        Device.status == "ONLINE"
    )
    res_online = await db.execute(q_online)
    online_count = res_online.scalar_one_or_none() or 0

    # 3. Offline devices count
    q_offline = select(func.count(Device.id)).where(
        Device.company_id == company.id,
        Device.deleted_at.is_(None),
        Device.status == "OFFLINE"
    )
    res_offline = await db.execute(q_offline)
    offline_count = res_offline.scalar_one_or_none() or 0

    # 4. Pending sync devices count
    q_pending = select(func.count(Device.id)).where(
        Device.company_id == company.id,
        Device.deleted_at.is_(None),
        Device.status == "PENDING_SYNC"
    )
    res_pending = await db.execute(q_pending)
    pending_count = res_pending.scalar_one_or_none() or 0

    return DashboardStatsResponse(
        total_devices=total_count,
        online_devices=online_count,
        offline_devices=offline_count,
        pending_sync_devices=pending_count
    )


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_active_company),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve recent telemetry logs for the active workspace."""
    activities = []

    # 1. Fetch latest 5 network logs for active company devices
    q_net = (
        select(NetworkLog, Device.device_name)
        .join(Device, NetworkLog.device_id == Device.id)
        .where(
            Device.company_id == company.id,
            Device.deleted_at.is_(None)
        )
        .order_by(NetworkLog.recorded_at.desc())
        .limit(5)
    )
    res_net = await db.execute(q_net)
    for log, dev_name in res_net.all():
        status_text = "Online" if log.is_online else "Offline"
        activities.append(
            RecentActivityItem(
                id=f"net-{log.id}",
                device_name=dev_name,
                action=f"Reported network connectivity: {log.network_type} ({status_text})",
                timestamp=log.recorded_at
            )
        )

    # 2. Fetch latest 5 battery logs for active company devices
    q_bat = (
        select(BatteryLog, Device.device_name)
        .join(Device, BatteryLog.device_id == Device.id)
        .where(
            Device.company_id == company.id,
            Device.deleted_at.is_(None)
        )
        .order_by(BatteryLog.recorded_at.desc())
        .limit(5)
    )
    res_bat = await db.execute(q_bat)
    for log, dev_name in res_bat.all():
        charge_text = "(Charging)" if log.charging else ""
        activities.append(
            RecentActivityItem(
                id=f"bat-{log.id}",
                device_name=dev_name,
                action=f"Reported battery level: {log.battery_level}% {charge_text}",
                timestamp=log.recorded_at
            )
        )

    # Sort merged activities by timestamp descending and take top 10
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    recent_items = activities[:10]

    return RecentActivityResponse(items=recent_items)
