from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.user import UserOut
from app.utils.security import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

VALID_PLANS = ("free", "starter", "pro")


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(_require_admin)):
    total_users    = db.query(func.count(User.id)).scalar()
    total_invoices = db.query(func.count(Invoice.id)).scalar()
    paid_invoices  = db.query(func.count(Invoice.id)).filter(Invoice.status == "paid").scalar()
    total_revenue  = db.query(func.sum(Invoice.total)).filter(Invoice.status == "paid").scalar() or 0.0
    plan_counts    = dict(db.query(User.plan, func.count(User.id)).group_by(User.plan).all())
    return {
        "total_users":    total_users,
        "total_invoices": total_invoices,
        "paid_invoices":  paid_invoices,
        "total_revenue":  round(total_revenue, 2),
        "plan_breakdown": plan_counts,
    }


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
def list_users(
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    return (
        db.query(User)
        .order_by(User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


class PlanUpdate(BaseModel):
    plan: str


@router.patch("/users/{user_id}/plan", response_model=UserOut)
def set_plan(
    user_id: str,
    payload: PlanUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    if payload.plan not in VALID_PLANS:
        raise HTTPException(400, detail=f"Plan must be one of: {VALID_PLANS}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="User not found")
    user.plan = payload.plan
    db.commit()
    db.refresh(user)
    return user


class ActiveUpdate(BaseModel):
    is_active: bool


@router.patch("/users/{user_id}/active", response_model=UserOut)
def set_active(
    user_id: str,
    payload: ActiveUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="User not found")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user
