import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Date, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=True)

    invoice_number = Column(String, nullable=False)  # e.g. INV-2024-0001

    # Customer details
    customer_name = Column(String, nullable=False)
    customer_email = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    customer_address = Column(Text, nullable=True)
    customer_gstin = Column(String, nullable=True)

    # Line items stored as JSON: [{name, quantity, rate, amount}]
    line_items = Column(JSONB, nullable=False, default=list)

    # Financials
    subtotal = Column(Float, nullable=False, default=0.0)
    gst_rate = Column(Float, nullable=False, default=18.0)  # % e.g. 18
    gst_amount = Column(Float, nullable=False, default=0.0)
    discount = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    currency = Column(String, default="INR")

    # Status
    status = Column(String, default="draft")  # draft | sent | paid | cancelled | overdue

    due_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    # Files / links
    pdf_url = Column(String, nullable=True)
    payment_link = Column(String, nullable=True)
    razorpay_payment_link_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="invoices")
    api_key = relationship("APIKey", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")
