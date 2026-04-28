import base64
import io
from datetime import datetime, timezone
from uuid import UUID

import qrcode
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.payment_method import PaymentMethod
from app.models.user import User
from app.schemas.payment_method import PaymentOut
from app.services.email_service import EmailService
from app.services.webhook_service import fire_webhook
from app.utils.cache import invalidate_invoice_cache
from app.utils.security import get_current_user, get_user_jwt_or_key
from pathlib import Path

router = APIRouter(tags=["Payments"])


# ── Public: customer-facing payment page ──────────────────────────────────────

@router.get("/pay/{invoice_id}/public")
def public_payment_details(invoice_id: UUID, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    merchant = db.query(User).filter(User.id == invoice.user_id).first()

    upi_method = (
        db.query(PaymentMethod)
        .filter(PaymentMethod.user_id == invoice.user_id, PaymentMethod.method_type == "upi", PaymentMethod.is_active == True)
        .order_by(PaymentMethod.is_default.desc())
        .first()
    )
    bank_method = (
        db.query(PaymentMethod)
        .filter(PaymentMethod.user_id == invoice.user_id, PaymentMethod.method_type == "bank", PaymentMethod.is_active == True)
        .order_by(PaymentMethod.is_default.desc())
        .first()
    )
    payment = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice.id)
        .order_by(Payment.created_at.desc())
        .first()
    )

    qr_b64 = ""
    if upi_method:
        upi_uri = (
            f"upi://pay?pa={upi_method.upi_id}"
            f"&pn={upi_method.upi_name or merchant.business_name or merchant.name}"
            f"&am={invoice.total:.2f}&cu=INR&tn={invoice.invoice_number}"
        )
        img = qrcode.make(upi_uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()

    return {
        "invoice": Invoice.model_validate(invoice).model_dump(mode="json") if hasattr(Invoice, "model_validate") else invoice,
        "merchant_name": merchant.business_name or merchant.name,
        "upi_method": upi_method,
        "bank_method": bank_method,
        "payment": payment,
        "qr_b64": qr_b64,
    }

class SubmitPaymentRequest(BaseModel):
    utr: str
    customer_note: str | None = None


@router.post("/pay/{invoice_id}/submit")
def submit_payment_proof(
    invoice_id: UUID,
    payload: SubmitPaymentRequest,
    db: Session = Depends(get_db),
):
    import re
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status in ("paid", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Invoice is {invoice.status}")

    utr = payload.utr.strip()
    if not re.match(r"^[A-Za-z0-9]{6,22}$", utr):
        raise HTTPException(status_code=400, detail="Invalid UTR format. Should be 6-22 alphanumeric characters.")
    if db.query(Payment).filter(Payment.utr == utr).first():
        raise HTTPException(status_code=400, detail="This UTR has already been submitted")

    db.add(Payment(
        invoice_id=invoice.id,
        amount=invoice.total,
        currency=invoice.currency,
        utr=utr,
        customer_note=payload.customer_note,
        status="submitted",
    ))
    invoice.status = "pending"
    db.commit()
    return {"message": "Payment proof submitted successfully"}


# ── Merchant: send invoice ─────────────────────────────────────────────────────

def _send_invoice_email_task(invoice_id, user_id):
    from app.database import SessionLocal
    from app.config import settings
    db = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not invoice or not user or not invoice.customer_email:
            return
        payment_url = f"{settings.APP_URL}/pay/{invoice.id}"
        from app.utils.pdf import generate_invoice_pdf
        try:
            pdf = generate_invoice_pdf(invoice, user)
        except Exception:
            pdf = None
        try:
            EmailService.send_invoice(
                to_email=invoice.customer_email,
                customer_name=invoice.customer_name,
                invoice_number=invoice.invoice_number,
                merchant_name=user.business_name or user.name,
                pdf_bytes=pdf,
                payment_link=payment_url,
            )
        except Exception as e:
            print(f"Failed to send invoice email: {e}")
    finally:
        db.close()


@router.post("/invoices/{invoice_id}/send", response_model=dict)
def send_invoice(
    invoice_id: UUID,
    background_tasks: BackgroundTasks,
    auth=Depends(get_user_jwt_or_key),
    db: Session = Depends(get_db),
):
    from app.config import settings
    user, api_key = auth
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user.id).first()
    if not invoice:
        raise HTTPException(404, detail="Invoice not found")
    if invoice.status == "paid":
        raise HTTPException(400, detail="Invoice is already paid")

    invoice.status = "sent"
    db.commit()
    invalidate_invoice_cache(str(user.id))

    payment_url = f"{settings.APP_URL}/pay/{invoice.id}"

    if invoice.customer_email:
        background_tasks.add_task(_send_invoice_email_task, invoice.id, user.id)

    return {
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "payment_url": payment_url,
        "amount": invoice.total,
        "currency": invoice.currency,
        "status": invoice.status,
    }


# ── Merchant: confirm / reject payment ────────────────────────────────────────

def _send_payment_confirmation_task(invoice_id, user_id, utr):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not invoice or not user:
            return
        
        if invoice.customer_email:
            try:
                EmailService.send_payment_confirmation(
                    to_email=invoice.customer_email,
                    customer_name=invoice.customer_name,
                    invoice_number=invoice.invoice_number,
                    amount=invoice.total,
                    merchant_name=user.business_name or user.name,
                )
            except Exception as e:
                print(f"Failed to send payment confirmation email: {e}")
        
        try:
            fire_webhook(db, user, "payment.confirmed", {
                "invoice_id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "amount": invoice.total,
                "currency": invoice.currency,
                "customer_name": invoice.customer_name,
                "utr": utr,
            })
        except Exception as e:
            print(f"Failed to fire webhook: {e}")
    finally:
        db.close()


@router.post("/invoices/{invoice_id}/confirm-payment", response_model=PaymentOut)
def confirm_payment(
    invoice_id: UUID,
    background_tasks: BackgroundTasks,
    auth=Depends(get_user_jwt_or_key),
    db: Session = Depends(get_db),
):
    user, api_key = auth
    invoice, payment = _get_invoice_and_pending_payment(db, invoice_id, user.id)

    payment.status = "confirmed"
    payment.confirmed_at = datetime.now(timezone.utc)
    invoice.status = "paid"
    db.commit()
    db.refresh(payment)
    invalidate_invoice_cache(str(user.id))

    background_tasks.add_task(_send_payment_confirmation_task, invoice.id, user.id, payment.utr)

    return payment


def _send_payment_rejected_task(invoice_id, user_id, utr, reason):
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not invoice or not user:
            return
        
        try:
            fire_webhook(db, user, "payment.rejected", {
                "invoice_id": str(invoice.id),
                "invoice_number": invoice.invoice_number,
                "amount": invoice.total,
                "currency": invoice.currency,
                "customer_name": invoice.customer_name,
                "utr": utr,
                "reason": reason,
            })
        except Exception as e:
            print(f"Failed to fire webhook: {e}")
    finally:
        db.close()

class RejectPaymentRequest(BaseModel):
    reason: str = "Payment could not be verified"

@router.post("/invoices/{invoice_id}/reject-payment", response_model=PaymentOut)
def reject_payment(
    invoice_id: UUID,
    payload: RejectPaymentRequest,
    background_tasks: BackgroundTasks,
    auth=Depends(get_user_jwt_or_key),
    db: Session = Depends(get_db),
):
    user, api_key = auth
    invoice, payment = _get_invoice_and_pending_payment(db, invoice_id, user.id)

    payment.status = "rejected"
    payment.rejection_reason = payload.reason
    
    # Check if there are other pending payments before reverting invoice status to sent
    other_pending = db.query(Payment).filter(
        Payment.invoice_id == invoice.id,
        Payment.status == "submitted",
        Payment.id != payment.id
    ).first()
    
    if not other_pending:
        invoice.status = "sent"

    db.commit()
    db.refresh(payment)
    invalidate_invoice_cache(str(user.id))

    background_tasks.add_task(_send_payment_rejected_task, invoice.id, user.id, payment.utr, payload.reason)

    return payment


@router.get("/invoices/{invoice_id}/payments", response_model=list[PaymentOut])
def list_payments(
    invoice_id: UUID,
    auth=Depends(get_user_jwt_or_key),
    db: Session = Depends(get_db),
):
    user, api_key = auth
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user.id).first()
    if not invoice:
        raise HTTPException(404, detail="Invoice not found")
    return invoice.payments


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_invoice_and_pending_payment(db: Session, invoice_id: UUID, user_id):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.user_id == user_id).first()
    if not invoice:
        raise HTTPException(404, detail="Invoice not found")
    payment = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice_id, Payment.status == "submitted")
        .order_by(Payment.created_at.desc())
        .first()
    )
    if not payment:
        raise HTTPException(404, detail="No submitted payment found for this invoice")
    return invoice, payment
