import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    business_name = Column(String, nullable=True)

    # Business profile (used in PDF headers)
    gstin = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String, nullable=True)

    plan = Column(String, default="free")  # free | starter | pro
    invoice_count_this_month = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)

    # Outgoing webhooks
    webhook_url = Column(String, nullable=True)
    webhook_secret = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="user", cascade="all, delete-orphan")
    payment_methods = relationship("PaymentMethod", back_populates="user", cascade="all, delete-orphan")
    webhook_deliveries = relationship("WebhookDelivery", back_populates="user", cascade="all, delete-orphan")
