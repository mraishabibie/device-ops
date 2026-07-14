import datetime
import uuid
from sqlalchemy import ForeignKey, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class Device(Base, TimestampMixin, SoftDeleteMixin):
    """SQLAlchemy model for devices"""
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    device_name: Mapped[str] = mapped_column(String(100), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    android_version: Mapped[str | None] = mapped_column(String(30), nullable=True)
    app_version: Mapped[str | None] = mapped_column(String(30), nullable=True)
    
    # Extended fields
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_type: Mapped[str] = mapped_column(String(20), default="PHONE", nullable=False) # PHONE/TABLET
    pairing_status: Mapped[str] = mapped_column(String(20), default="UNPAIRED", nullable=False, index=True) # PAIRED/UNPAIRED
    status: Mapped[str] = mapped_column(String(20), default="PENDING_SYNC", nullable=False, index=True) # ONLINE/OFFLINE/PENDING_SYNC
    
    last_sync_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="devices")
    pairing_tokens: Mapped[list["PairingToken"]] = relationship(
        "PairingToken",
        back_populates="device",
        cascade="all, delete-orphan"
    )
    gps_logs: Mapped[list["GPSLog"]] = relationship(
        "GPSLog",
        back_populates="device",
        cascade="all, delete-orphan"
    )
    battery_logs: Mapped[list["BatteryLog"]] = relationship(
        "BatteryLog",
        back_populates="device",
        cascade="all, delete-orphan"
    )
    network_logs: Mapped[list["NetworkLog"]] = relationship(
        "NetworkLog",
        back_populates="device",
        cascade="all, delete-orphan"
    )
