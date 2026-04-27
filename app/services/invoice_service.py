from datetime import date
from sqlalchemy.orm import Session

from app.config import settings
from app.models.api_key import APIKey
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate


class InvoiceService:

    @staticmethod
    def _generate_invoice_number(db: Session, user_id) -> str:
        """Generate sequential invoice number like INV-2024-0042."""
        year = date.today().year
        count = db.query(Invoice).filter(Invoice.user_id == user_id).count() + 1
        return f"INV-{year}-{count:04d}"

    @staticmethod
    def _calculate_totals(line_items: list, gst_rate: float, discount: float) -> tuple:
        """Returns (subtotal, gst_amount, total)."""
        subtotal = sum(item["quantity"] * item["rate"] for item in line_items)
        subtotal = round(subtotal, 2)
        after_discount = max(subtotal - discount, 0)
        gst_amount = round(after_discount * gst_rate / 100, 2)
        total = round(after_discount + gst_amount, 2)
        return subtotal, gst_amount, total

    @staticmethod
    def create(db: Session, user: User, api_key: APIKey, payload: InvoiceCreate) -> Invoice:
        # Enforce free tier limit
        if user.plan == "free" and user.invoice_count_this_month >= settings.FREE_INVOICE_LIMIT:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Free plan limit reached ({settings.FREE_INVOICE_LIMIT} invoices/month). "
                    "Upgrade to Starter or Pro."
                ),
            )

        line_items = [item.model_dump() for item in payload.line_items]
        subtotal, gst_amount, total = InvoiceService._calculate_totals(
            line_items, payload.gst_rate, payload.discount
        )

        invoice = Invoice(
            user_id=user.id,
            api_key_id=api_key.id,
            invoice_number=InvoiceService._generate_invoice_number(db, user.id),
            customer_name=payload.customer_name,
            customer_email=payload.customer_email,
            customer_phone=payload.customer_phone,
            customer_address=payload.customer_address,
            customer_gstin=payload.customer_gstin,
            line_items=line_items,
            subtotal=subtotal,
            gst_rate=payload.gst_rate,
            gst_amount=gst_amount,
            discount=payload.discount,
            total=total,
            currency=payload.currency,
            due_date=payload.due_date,
            notes=payload.notes,
            status="draft",
        )
        db.add(invoice)

        user.invoice_count_this_month += 1
        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def update(db: Session, invoice: Invoice, payload: InvoiceUpdate) -> Invoice:
        update_data = payload.model_dump(exclude_none=True)

        if "line_items" in update_data:
            update_data["line_items"] = [item.model_dump() for item in payload.line_items]

        for field, value in update_data.items():
            setattr(invoice, field, value)

        if any(k in update_data for k in ("line_items", "gst_rate", "discount")):
            subtotal, gst_amount, total = InvoiceService._calculate_totals(
                invoice.line_items, invoice.gst_rate, invoice.discount
            )
            invoice.subtotal = subtotal
            invoice.gst_amount = gst_amount
            invoice.total = total

        db.commit()
        db.refresh(invoice)
        return invoice
