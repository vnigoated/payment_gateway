from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String

from app.database import Base


class RazorpayWebhookEvent(Base):
    __tablename__ = "razorpay_webhook_events"

    event_id = Column(String, primary_key=True)
    event_name = Column(String, nullable=True)
    processed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
