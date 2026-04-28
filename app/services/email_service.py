import base64

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Attachment, Disposition, FileContent, FileName, FileType, Mail,
)

from app.config import settings

_BASE = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;padding:32px 0;"
_CARD = "background:#fff;border-radius:8px;padding:32px;max-width:560px;margin:0 auto;"
_BTN  = "display:inline-block;padding:12px 28px;background:#1e3a5f;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;"
_FOOT = "<p style='color:#94a3b8;font-size:12px;text-align:center;margin-top:24px'>Invoice API &middot; Automated message, please do not reply.</p>"


def _send(msg: Mail) -> bool:
    if not settings.SENDGRID_API_KEY:
        return False
    try:
        SendGridAPIClient(settings.SENDGRID_API_KEY).send(msg)
        return True
    except Exception:
        return False


class EmailService:

    @staticmethod
    def send_invoice(
        to_email: str,
        customer_name: str,
        invoice_number: str,
        merchant_name: str,
        pdf_bytes: bytes | None = None,
        payment_link: str | None = None,
    ) -> bool:
        pay_btn = (
            f"<p style='text-align:center;margin:28px 0'><a href='{payment_link}' style='{_BTN}'>Pay Now</a></p>"
            if payment_link else ""
        )
        html = f"""<div style='{_BASE}'><div style='{_CARD}'>
          <h2 style='color:#1e3a5f;margin-top:0'>Invoice {invoice_number}</h2>
          <p>Hi {customer_name},</p>
          <p>Please find invoice <strong>{invoice_number}</strong> from <strong>{merchant_name}</strong> attached.</p>
          {pay_btn}
          <p style='color:#64748b;font-size:13px'>The PDF invoice is attached for your records.</p>
          {_FOOT}</div></div>"""
        msg = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=to_email,
            subject=f"Invoice {invoice_number} from {merchant_name}",
            html_content=html,
        )
        if pdf_bytes:
            msg.attachment = Attachment(
                FileContent(base64.b64encode(pdf_bytes).decode()),
                FileName(f"{invoice_number}.pdf"),
                FileType("application/pdf"),
                Disposition("attachment"),
            )
        return _send(msg)

    @staticmethod
    def send_payment_confirmation(
        to_email: str,
        customer_name: str,
        invoice_number: str,
        amount: float,
        merchant_name: str,
    ) -> bool:
        html = f"""<div style='{_BASE}'><div style='{_CARD}'>
          <h2 style='color:#059669;margin-top:0'>Payment Confirmed &#10003;</h2>
          <p>Hi {customer_name},</p>
          <p>Your payment of <strong>Rs. {amount:,.2f}</strong> for invoice
             <strong>{invoice_number}</strong> has been confirmed by <strong>{merchant_name}</strong>.</p>
          <p style='color:#64748b;font-size:13px'>Keep this email as your payment receipt.</p>
          {_FOOT}</div></div>"""
        msg = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=to_email,
            subject=f"Payment confirmed — {invoice_number}",
            html_content=html,
        )
        return _send(msg)

    @staticmethod
    def send_password_reset(to_email: str, reset_url: str) -> bool:
        html = f"""<div style='{_BASE}'><div style='{_CARD}'>
          <h2 style='color:#1e3a5f;margin-top:0'>Reset your password</h2>
          <p>We received a request to reset the password for your Invoice API account.</p>
          <p>Click the button below &mdash; this link expires in <strong>1 hour</strong>.</p>
          <p style='text-align:center;margin:28px 0'><a href='{reset_url}' style='{_BTN}'>Reset Password</a></p>
          <p style='color:#64748b;font-size:13px'>If you did not request this, you can safely ignore this email.</p>
          {_FOOT}</div></div>"""
        msg = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=to_email,
            subject="Reset your Invoice API password",
            html_content=html,
        )
        return _send(msg)

    @staticmethod
    def send_upgrade_request(
        admin_email: str,
        user_email: str,
        user_name: str,
        plan: str,
        price: int,
        utr: str,
        note: str = "",
    ) -> bool:
        note_row = f"<tr><td style='padding:8px 0;color:#64748b'>Note</td><td>{note}</td></tr>" if note else ""
        html = f"""<div style='{_BASE}'><div style='{_CARD}'>
          <h2 style='color:#1e3a5f;margin-top:0'>Plan Upgrade Request</h2>
          <table style='width:100%;border-collapse:collapse;font-size:14px'>
            <tr><td style='padding:8px 0;color:#64748b'>User</td>
                <td><strong>{user_name}</strong> ({user_email})</td></tr>
            <tr><td style='padding:8px 0;color:#64748b'>Plan</td>
                <td><strong>{plan.title()}</strong> &mdash; Rs. {price}/mo</td></tr>
            <tr><td style='padding:8px 0;color:#64748b'>UTR / Ref</td>
                <td><code>{utr}</code></td></tr>
            {note_row}
          </table>
          <p style='color:#64748b;font-size:13px;margin-top:20px'>Verify the UTR in your bank app, then set the plan in the admin panel.</p>
          {_FOOT}</div></div>"""
        msg = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=admin_email,
            subject=f"[Upgrade Request] {user_name} → {plan.title()}",
            html_content=html,
        )
        return _send(msg)
