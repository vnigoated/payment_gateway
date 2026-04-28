from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class PaymentOut(BaseModel):
    id: UUID
    invoice_id: UUID
    razorpay_order_id: str | None
    razorpay_payment_id: str | None
    amount: float
    currency: str
    status: str
    method: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
