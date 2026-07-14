import pytest
from pydantic import ValidationError
from app.schemas.telemetry import DashboardStatsResponse, RecentActivityItem
import uuid
from datetime import datetime, timezone


def test_dashboard_stats_validation_success():
    schema = DashboardStatsResponse(
        total_devices=10,
        online_devices=5,
        offline_devices=3,
        pending_sync_devices=2
    )
    assert schema.total_devices == 10
    assert schema.online_devices == 5


def test_recent_activity_item_validation_success():
    now = datetime.now(timezone.utc)
    schema = RecentActivityItem(
        id="net-1234",
        device_name="Test Phone",
        action="Reported status ONLINE",
        timestamp=now
    )
    assert schema.id == "net-1234"
    assert schema.device_name == "Test Phone"
    assert schema.timestamp == now
