import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.database import Base


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    event = Column(String, nullable=False)       # payment.confirmed | payment.rejected
    payload = Column(JSONB, nullable=False)
    status = Column(String, nullable=False)      # delivered | failed
    response_code = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=1)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="webhook_deliveries")
