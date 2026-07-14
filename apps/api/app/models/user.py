import datetime
import uuid
from sqlalchemy import ForeignKey, String, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, SoftDeleteMixin


class User(Base, TimestampMixin, SoftDeleteMixin):
    """SQLAlchemy model for users"""
    __tablename__ = "users"

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
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="ADMIN", nullable=False) # OWNER/ADMIN/VIEWER
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False, index=True) # ACTIVE/DISABLED
    last_login_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    company: Mapped["Company"] = relationship("Company", back_populates="users")

    # Table arguments for composite unique constraint
    __table_args__ = (
        UniqueConstraint("company_id", "email", name="uq_users_company_email"),
    )
