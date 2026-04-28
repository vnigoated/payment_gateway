from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, field_validator


class UPIMethodCreate(BaseModel):
    label: str
    upi_id: str        # e.g. yourbiz@okaxis
    upi_name: str      # shown inside UPI apps
    is_default: bool = False

    @field_validator("upi_id")
    @classmethod
    def validate_upi(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("UPI ID must contain '@' (e.g. yourname@okaxis)")
        return v.strip().lower()


class BankMethodCreate(BaseModel):
    label: str
    bank_name: str
    account_holder: str
    account_number: str
    ifsc_code: str
    account_type: str = "current"   # savings | current
    is_default: bool = False

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 11:
            raise ValueError("IFSC code must be 11 characters")
        return v


class PaymentMethodOut(BaseModel):
    id: UUID
    method_type: str
    label: str
    upi_id: str | None
    upi_name: str | None
    bank_name: str | None
    account_holder: str | None
    account_number: str | None
    ifsc_code: str | None
    account_type: str | None
    is_default: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentSubmit(BaseModel):
    """Sent by the customer on the payment page to submit proof."""
    utr: str               # UTR / transaction reference number
    customer_note: str | None = None


class PaymentOut(BaseModel):
    id: UUID
    invoice_id: UUID
    amount: float
    currency: str
    method_type: str | None
    utr: str | None
    customer_note: str | None
    status: str
    confirmed_at: datetime | None
    rejection_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
