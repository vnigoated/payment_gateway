import base64
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Attachment,
    Disposition,
    FileContent,
    FileName,
    FileType,
    Mail,
)

from app.config import settings

_TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates" / "emails"
_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def _send(msg: Mail) -> bool:
    if not settings.SENDGRID_API_KEY:
        return False
    try:
        SendGridAPIClient(settings.SENDGRID_API_KEY).send(msg)
        return True
    except Exception:
        return False


def _render(template_name: str, **context) -> str:
    return _env.get_template(template_name).render(
        app_name=settings.APP_NAME,
        **context,
    )


class EmailService:
    @staticmethod
    def send_invoice(
        to_email: str,
        customer_name: str,
        invoice_number: str,
        merchant_name: str,
        pdf_bytes: bytes | None = None,
        payment_link: str | None = None,
        qr_b64: str | None = None,
    ) -> bool:
        html = _render(
            "invoice.html",
            customer_name=customer_name,
            invoice_number=invoice_number,
            merchant_name=merchant_name,
            payment_link=payment_link,
            qr_b64=qr_b64,
        )
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
        html = _render(
            "payment_confirmation.html",
            customer_name=customer_name,
            invoice_number=invoice_number,
            amount=f"Rs. {amount:,.2f}",
            merchant_name=merchant_name,
        )
        msg = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=to_email,
            subject=f"Payment confirmed - {invoice_number}",
            html_content=html,
        )
        return _send(msg)

    @staticmethod
    def send_password_reset(to_email: str, reset_url: str) -> bool:
        html = _render("password_reset.html", reset_url=reset_url)
        msg = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=to_email,
            subject=f"Reset your {settings.APP_NAME} password",
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
        plan_name = plan.title()
        html = _render(
            "upgrade_request.html",
            user_email=user_email,
            user_name=user_name,
            plan=plan_name,
            price=f"Rs. {price}/mo",
            utr=utr,
            note=note,
        )
        msg = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=admin_email,
            subject=f"[Upgrade Request] {user_name} -> {plan_name}",
            html_content=html,
        )
        return _send(msg)
