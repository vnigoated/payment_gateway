"""
Native payment service — no third-party payment gateway.

Payment flow:
  1. Merchant adds UPI ID or bank account via /payment-methods
  2. Merchant calls POST /invoices/{id}/send → gets payment_url
  3. Merchant shares payment_url with customer (WhatsApp / email / SMS)
  4. Customer visits payment_url → sees QR code + bank details
  5. Customer pays via UPI/bank and submits UTR
  6. Merchant sees pending confirmation in dashboard
  7. Merchant calls POST /invoices/{id}/confirm-payment → invoice marked paid
  8. (Phase 4) Webhook fires to merchant's registered URL
"""
import base64
import io

import qrcode


def build_upi_uri(upi_id: str, name: str, amount: float, invoice_number: str) -> str:
    """Build a standard UPI deep-link URI."""
    return (
        f"upi://pay?pa={upi_id}"
        f"&pn={name}"
        f"&am={amount:.2f}"
        f"&cu=INR"
        f"&tn={invoice_number}"
    )


def generate_upi_qr_base64(upi_uri: str) -> str:
    """Generate a QR code PNG from a UPI URI and return as base64 string."""
    img = qrcode.make(upi_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def generate_upi_qr_bytes(upi_uri: str) -> bytes:
    """Generate a QR code PNG from a UPI URI and return raw bytes (for PDF embedding)."""
    img = qrcode.make(upi_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
