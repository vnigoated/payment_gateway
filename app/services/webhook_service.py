import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.models.webhook import WebhookDelivery


def generate_webhook_secret() -> str:
    return "whsec_" + secrets.token_hex(24)


def _sign(body: str, secret: str) -> str:
    return hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()


def fire_webhook(db: Session, user, event: str, payload: dict) -> None:
    """POST a signed JSON event to the merchant's webhook URL and log the attempt."""
    if not getattr(user, "webhook_url", None) or not getattr(user, "webhook_secret", None):
        return

    body = json.dumps(
        {"event": event, "timestamp": datetime.now(timezone.utc).isoformat(), **payload},
        default=str,
    )
    sig = _sign(body, user.webhook_secret)

    status = "failed"
    response_code = None
    error = None
    delivered_at = None

    try:
        with httpx.Client(timeout=10) as client:
            r = client.post(
                user.webhook_url,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Invoice-Signature": sig,
                    "X-Invoice-Event": event,
                    "User-Agent": "InvoiceAPI/1.0",
                },
            )
        response_code = r.status_code
        if r.is_success:
            status = "delivered"
            delivered_at = datetime.now(timezone.utc)
        else:
            error = f"HTTP {r.status_code}: {r.text[:200]}"
    except Exception as exc:
        error = str(exc)[:500]

    db.add(WebhookDelivery(
        user_id=user.id,
        event=event,
        payload=payload,
        status=status,
        response_code=response_code,
        error=error,
        delivered_at=delivered_at,
    ))
    db.commit()
