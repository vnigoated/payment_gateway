from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.email_service import EmailService
from app.services.razorpay_service import create_subscription, unix_to_utc, verify_webhook_signature
from app.utils.security import get_current_user

router = APIRouter(prefix="/billing", tags=["Billing"])

PLANS = {
    "free": {
        "name": "Free",
        "price_inr": 0,
        "invoices_per_month": 5,
        "api_calls_per_day": 500,
        "api_calls_per_min": 30,
        "features": ["5 invoices/month", "PDF generation", "UPI + bank payments", "API access"],
    },
    "starter": {
        "name": "Starter",
        "price_inr": 499,
        "invoices_per_month": 100,
        "api_calls_per_day": 5_000,
        "api_calls_per_min": 60,
        "features": ["100 invoices/month", "PDF generation", "Email delivery", "Webhooks", "Priority support"],
    },
    "pro": {
        "name": "Pro",
        "price_inr": 1499,
        "invoices_per_month": -1,
        "api_calls_per_day": 100_000,
        "api_calls_per_min": 120,
        "features": ["Unlimited invoices", "PDF generation", "Email delivery", "Webhooks", "Team members (coming soon)", "Dedicated support"],
    },
}


@router.get("/plans")
def list_plans():
    return PLANS


@router.get("/current")
def current_plan(user: User = Depends(get_current_user)):
    return {
        "plan": user.plan,
        **PLANS.get(user.plan, PLANS["free"]),
        "razorpay_subscription_id": user.razorpay_subscription_id,
        "subscription_status": user.subscription_status,
        "current_period_end": user.current_period_end,
    }


class CheckoutRequest(BaseModel):
    plan: str


@router.post("/checkout")
def create_billing_checkout(
    payload: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.plan not in ("starter", "pro"):
        raise HTTPException(400, detail="Plan must be 'starter' or 'pro'")
    if payload.plan == user.plan and user.subscription_status in ("active", "authenticated"):
        raise HTTPException(400, detail=f"You are already on the {user.plan} plan")

    subscription = create_subscription(user, payload.plan)

    user.razorpay_subscription_id = subscription["id"]
    user.subscription_status = subscription.get("status", "created")
    db.commit()
    db.refresh(user)

    return {
        "key_id": settings.RAZORPAY_KEY_ID,
        "subscription_id": subscription["id"],
        "short_url": subscription.get("short_url"),
        "plan": payload.plan,
        "amount": PLANS[payload.plan]["price_inr"],
        "currency": "INR",
        "merchant_name": settings.APP_NAME,
        "prefill": {
            "name": user.name,
            "email": user.email,
        },
    }


def _subscription_from_event(event: dict):
    return event.get("payload", {}).get("subscription", {}).get("entity", {})


def _plan_from_subscription(subscription: dict) -> str | None:
    notes = subscription.get("notes") or {}
    plan = notes.get("plan")
    return plan if plan in ("starter", "pro") else None


def _user_from_subscription(db: Session, subscription: dict) -> User | None:
    notes = subscription.get("notes") or {}
    user_id = notes.get("user_id")
    subscription_id = subscription.get("id")
    query = db.query(User)
    if user_id:
        user = query.filter(User.id == user_id).first()
        if user:
            return user
    if subscription_id:
        return query.filter(User.razorpay_subscription_id == subscription_id).first()
    return None


@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    if not verify_webhook_signature(raw_body, signature):
        raise HTTPException(400, detail="Invalid Razorpay signature")

    event = await request.json()
    event_name = event.get("event")
    subscription = _subscription_from_event(event)
    if not subscription:
        return {"ok": True}

    user = _user_from_subscription(db, subscription)
    if not user:
        return {"ok": True}

    subscription_id = subscription.get("id")
    if subscription_id:
        user.razorpay_subscription_id = subscription_id
    user.subscription_status = subscription.get("status") or user.subscription_status

    plan = _plan_from_subscription(subscription)
    if event_name in ("subscription.activated", "subscription.charged") and plan:
        user.plan = plan
    elif event_name in ("subscription.cancelled", "subscription.halted", "subscription.paused"):
        user.plan = "free"

    user.current_period_end = (
        unix_to_utc(subscription.get("current_end"))
        or unix_to_utc(subscription.get("end_at"))
        or user.current_period_end
    )
    db.commit()
    return {"ok": True}


class UpgradeRequest(BaseModel):
    plan: str
    utr: str
    note: str = ""


@router.post("/upgrade-request")
def upgrade_request(
    payload: UpgradeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a payment reference (UTR) for a plan upgrade.
    Admin will verify and upgrade the account within 24 hours.
    """
    if payload.plan not in ("starter", "pro"):
        raise HTTPException(400, detail="Plan must be 'starter' or 'pro'")
    if payload.plan == user.plan:
        raise HTTPException(400, detail=f"You are already on the {user.plan} plan")
    if not payload.utr.strip():
        raise HTTPException(400, detail="UTR / payment reference is required")

    price = PLANS[payload.plan]["price_inr"]

    if settings.ADMIN_EMAIL:
        EmailService.send_upgrade_request(
            admin_email=settings.ADMIN_EMAIL,
            user_email=user.email,
            user_name=user.name,
            plan=payload.plan,
            price=price,
            utr=payload.utr.strip(),
            note=payload.note,
        )

    return {
        "message": (
            f"Upgrade request to {PLANS[payload.plan]['name']} received. "
            "We will verify your payment and upgrade your account within 24 hours."
        )
    }
