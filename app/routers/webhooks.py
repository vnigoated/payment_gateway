from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.webhook import WebhookDelivery
from app.services.webhook_service import generate_webhook_secret
from app.utils.security import get_current_user

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class WebhookConfigIn(BaseModel):
    url: HttpUrl


# ── Register / update webhook URL ─────────────────────────────────────────────

@router.post("/config")
def register_webhook(
    payload: WebhookConfigIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register (or replace) your webhook endpoint. Returns the signing secret once."""
    user.webhook_url = str(payload.url)
    user.webhook_secret = generate_webhook_secret()
    db.commit()
    return {
        "webhook_url": user.webhook_url,
        "webhook_secret": user.webhook_secret,
        "note": "Store the webhook_secret securely — it will not be shown again in full.",
    }


@router.get("/config")
def get_webhook_config(user: User = Depends(get_current_user)):
    """Get your current webhook configuration."""
    if not user.webhook_url:
        return {"webhook_url": None, "webhook_secret_hint": None}
    hint = ("whsec_••••" + user.webhook_secret[-4:]) if user.webhook_secret else None
    return {"webhook_url": user.webhook_url, "webhook_secret_hint": hint}


@router.delete("/config", status_code=204)
def delete_webhook(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Remove your webhook endpoint."""
    user.webhook_url = None
    user.webhook_secret = None
    db.commit()


# ── Delivery logs ─────────────────────────────────────────────────────────────

@router.get("/deliveries")
def list_deliveries(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the 50 most recent webhook delivery attempts."""
    rows = (
        db.query(WebhookDelivery)
        .filter(WebhookDelivery.user_id == user.id)
        .order_by(WebhookDelivery.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "event": r.event,
            "status": r.status,
            "response_code": r.response_code,
            "error": r.error,
            "delivered_at": r.delivered_at,
            "created_at": r.created_at,
        }
        for r in rows
    ]
