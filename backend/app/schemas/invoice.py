from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class LineItem(BaseModel):
    name: str
    quantity: float
    rate: float  # per unit price in INR

    @property
    def amount(self) -> float:
        return round(self.quantity * self.rate, 2)

    def model_dump(self, **kwargs):
        d = super().model_dump(**kwargs)
        d["amount"] = self.amount
        return d


class InvoiceCreate(BaseModel):
    customer_name: str
    customer_email: str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    customer_gstin: str | None = None
    line_items: list[LineItem]
    gst_rate: float = 18.0
    discount: float = 0.0
    due_date: date | None = None
    notes: str | None = None
    currency: str = "INR"

    @field_validator("line_items")
    @classmethod
    def at_least_one_item(cls, v: list) -> list:
        if not v:
            raise ValueError("At least one line item is required")
        return v

    @field_validator("gst_rate")
    @classmethod
    def valid_gst(cls, v: float) -> float:
        if v not in (0, 5, 12, 18, 28):
            raise ValueError("GST rate must be 0, 5, 12, 18, or 28")
        return v


class InvoiceUpdate(BaseModel):
    customer_name: str | None = None
    customer_email: str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    customer_gstin: str | None = None
    line_items: list[LineItem] | None = None
    gst_rate: float | None = None
    discount: float | None = None
    due_date: date | None = None
    notes: str | None = None
    status: str | None = None


class InvoiceOut(BaseModel):
    id: UUID
    invoice_number: str
    customer_name: str
    customer_email: str | None
    customer_phone: str | None
    customer_address: str | None
    customer_gstin: str | None
    line_items: list
    subtotal: float
    gst_rate: float
    gst_amount: float
    discount: float
    total: float
    currency: str
    status: str
    due_date: date | None
    notes: str | None
    pdf_url: str | None
    payment_link: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
