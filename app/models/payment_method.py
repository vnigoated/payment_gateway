import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PaymentMethod(Base):
    """
    A merchant's payment receiving details — UPI ID or bank account.
    Each user can have multiple methods; one is marked as default.
    """
    __tablename__ = "payment_methods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # "upi" or "bank"
    method_type = Column(String, nullable=False)

    # Display label, e.g. "Business UPI" or "HDFC Current Account"
    label = Column(String, nullable=False)

    # UPI fields (used when method_type == "upi")
    upi_id = Column(String, nullable=True)          # e.g. yourbiz@okaxis
    upi_name = Column(String, nullable=True)         # name shown in UPI apps

    # Bank transfer fields (used when method_type == "bank")
    bank_name = Column(String, nullable=True)
    account_holder = Column(String, nullable=True)
    account_number = Column(String, nullable=True)
    ifsc_code = Column(String, nullable=True)
    account_type = Column(String, nullable=True)     # savings / current

    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="payment_methods")
