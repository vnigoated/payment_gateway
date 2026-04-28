from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services.email_service import EmailService
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
    return {"plan": user.plan, **PLANS.get(user.plan, PLANS["free"])}


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
