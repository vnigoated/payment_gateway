import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # We store a hash of the key. The raw key is shown to the user only once.
    key_hash = Column(String, unique=True, nullable=False, index=True)
    # First 8 chars of the raw key — safe to store, used to identify the key in UI
    key_prefix = Column(String(12), nullable=False)

    name = Column(String, nullable=False, default="Default")
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="api_keys")
    invoices = relationship("Invoice", back_populates="api_key")
