import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    payment_method_id = Column(UUID(as_uuid=True), ForeignKey("payment_methods.id"), nullable=True)

    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")

    # "upi" | "bank_transfer" | "cash" | "cheque"
    method_type = Column(String, nullable=True)

    # UTR / reference number submitted by customer as proof
    utr = Column(String, nullable=True, index=True)
    customer_note = Column(Text, nullable=True)

    # "pending" | "submitted" | "confirmed" | "rejected"
    # pending   → payment link opened, no action yet
    # submitted → customer submitted UTR proof
    # confirmed → merchant manually confirmed receipt
    # rejected  → merchant rejected the UTR (wrong amount, invalid, etc.)
    status = Column(String, default="pending")

    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    invoice = relationship("Invoice", back_populates="payments")
    payment_method = relationship("PaymentMethod")
