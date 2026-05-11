import hmac
import hashlib
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException

from app.config import settings
from app.models.user import User


PLAN_IDS = {
    "starter": settings.RAZORPAY_STARTER_PLAN_ID,
    "pro": settings.RAZORPAY_PRO_PLAN_ID,
}


def is_configured() -> bool:
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def _plan_id(plan: str) -> str:
    if plan not in PLAN_IDS:
        raise HTTPException(status_code=400, detail="Plan must be 'starter' or 'pro'")
    plan_id = PLAN_IDS[plan]
    if not plan_id:
        raise HTTPException(status_code=503, detail=f"Razorpay plan ID for {plan} is not configured")
    return plan_id


def create_subscription(user: User, plan: str) -> dict[str, Any]:
    if not is_configured():
        raise HTTPException(status_code=503, detail="Razorpay is not configured")

    payload = {
        "plan_id": _plan_id(plan),
        "total_count": 120,
        "quantity": 1,
        "customer_notify": 1,
        "notes": {
            "user_id": str(user.id),
            "user_email": user.email,
            "plan": plan,
        },
    }

    try:
        with httpx.Client(timeout=20) as client:
            response = client.post(
                "https://api.razorpay.com/v1/subscriptions",
                json=payload,
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Could not reach Razorpay") from exc

    if response.status_code >= 400:
        detail = response.json().get("error", {}).get("description", "Razorpay subscription creation failed")
        raise HTTPException(status_code=502, detail=detail)

    return response.json()


def verify_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
    if not settings.RAZORPAY_WEBHOOK_SECRET or not signature:
        return False
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def unix_to_utc(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value), timezone.utc)
    except (TypeError, ValueError, OSError):
        return None
