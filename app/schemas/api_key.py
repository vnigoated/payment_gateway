from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class APIKeyCreate(BaseModel):
    name: str = "Default"


class APIKeyOut(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    is_active: bool
    usage_count: int
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class APIKeyCreated(APIKeyOut):
    """Returned only once at creation — includes the raw key."""
    raw_key: str
