import base64
import io
from datetime import datetime, timezone
from uuid import UUID

import qrcode
from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
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

templates = Jinja2Templates(directory=str(Path(__file__).parent.parent / "templates"))
router = APIRouter(tags=["Payments"])


# ── Public: customer-facing payment page ──────────────────────────────────────

@router.get("/pay/{invoice_id}", response_class=HTMLResponse)
def payment_page(invoice_id: UUID, request: Request, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        return HTMLResponse("<h2>Invoice not found</h2>", status_code=404)

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

    return templates.TemplateResponse("payment_page.html", {
        "request": request,
        "invoice": invoice,
        "merchant_name": merchant.business_name or merchant.name,
        "upi_method": upi_method,
        "bank_method": bank_method,
        "payment": payment,
        "qr_b64": qr_b64,
    })


@router.post("/pay/{invoice_id}/submit")
def submit_payment_proof(
    invoice_id: UUID,
    utr: str = Form(...),
    customer_note: str = Form(None),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status in ("paid", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Invoice is {invoice.status}")

    utr = utr.strip()
    if len(utr) < 6:
        raise HTTPException(status_code=400, detail="UTR number looks too short")
    if db.query(Payment).filter(Payment.utr == utr).first():
        raise HTTPException(status_code=400, detail="This UTR has already been submitted")

    db.add(Payment(
        invoice_id=invoice.id,
        amount=invoice.total,
        currency=invoice.currency,
        utr=utr,
        customer_note=customer_note,
        status="submitted",
    ))
    invoice.status = "pending"
    db.commit()
    return RedirectResponse(url=f"/pay/{invoice_id}", status_code=303)


# ── Merchant: send invoice ─────────────────────────────────────────────────────

@router.post("/invoices/{invoice_id}/send", response_model=dict)
def send_invoice(
    invoice_id: UUID,
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

    # Email customer the invoice + payment link (non-blocking)
    if invoice.customer_email:
        try:
            from app.utils.pdf import generate_invoice_pdf
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
        except Exception:
            pass

    return {
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "payment_url": payment_url,
        "amount": invoice.total,
        "currency": invoice.currency,
        "status": invoice.status,
    }


# ── Merchant: confirm / reject payment ────────────────────────────────────────

@router.post("/invoices/{invoice_id}/confirm-payment", response_model=PaymentOut)
def confirm_payment(
    invoice_id: UUID,
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

    # Email receipt to customer (non-blocking)
    if invoice.customer_email:
        try:
            EmailService.send_payment_confirmation(
                to_email=invoice.customer_email,
                customer_name=invoice.customer_name,
                invoice_number=invoice.invoice_number,
                amount=invoice.total,
                merchant_name=user.business_name or user.name,
            )
        except Exception:
            pass

    # Fire webhook (non-blocking)
    try:
        fire_webhook(db, user, "payment.confirmed", {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "amount": invoice.total,
            "currency": invoice.currency,
            "customer_name": invoice.customer_name,
            "utr": payment.utr,
        })
    except Exception:
        pass

    return payment


@router.post("/invoices/{invoice_id}/reject-payment", response_model=PaymentOut)
def reject_payment(
    invoice_id: UUID,
    reason: str = "Payment could not be verified",
    auth=Depends(get_user_jwt_or_key),
    db: Session = Depends(get_db),
):
    user, api_key = auth
    invoice, payment = _get_invoice_and_pending_payment(db, invoice_id, user.id)

    payment.status = "rejected"
    payment.rejection_reason = reason
    invoice.status = "sent"
    db.commit()
    db.refresh(payment)
    invalidate_invoice_cache(str(user.id))

    # Fire webhook (non-blocking)
    try:
        fire_webhook(db, user, "payment.rejected", {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "amount": invoice.total,
            "currency": invoice.currency,
            "customer_name": invoice.customer_name,
            "utr": payment.utr,
            "reason": reason,
        })
    except Exception:
        pass

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
