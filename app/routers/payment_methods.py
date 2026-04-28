from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment_method import PaymentMethod
from app.models.user import User
from app.schemas.payment_method import UPIMethodCreate, BankMethodCreate, PaymentMethodOut
from app.utils.security import get_current_user

router = APIRouter(prefix="/payment-methods", tags=["Payment Methods"])


@router.post("/upi", response_model=PaymentMethodOut, status_code=status.HTTP_201_CREATED)
def add_upi(
    payload: UPIMethodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a UPI ID to receive payments on invoices."""
    if payload.is_default:
        _clear_defaults(db, current_user.id)

    method = PaymentMethod(
        user_id=current_user.id,
        method_type="upi",
        label=payload.label,
        upi_id=payload.upi_id,
        upi_name=payload.upi_name,
        is_default=payload.is_default,
    )
    db.add(method)
    db.commit()
    db.refresh(method)
    return method


@router.post("/bank", response_model=PaymentMethodOut, status_code=status.HTTP_201_CREATED)
def add_bank(
    payload: BankMethodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a bank account (NEFT/IMPS/RTGS) to receive payments."""
    if payload.is_default:
        _clear_defaults(db, current_user.id)

    method = PaymentMethod(
        user_id=current_user.id,
        method_type="bank",
        label=payload.label,
        bank_name=payload.bank_name,
        account_holder=payload.account_holder,
        account_number=payload.account_number,
        ifsc_code=payload.ifsc_code,
        account_type=payload.account_type,
        is_default=payload.is_default,
    )
    db.add(method)
    db.commit()
    db.refresh(method)
    return method


@router.get("", response_model=list[PaymentMethodOut])
def list_methods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all your payment methods."""
    return db.query(PaymentMethod).filter(
        PaymentMethod.user_id == current_user.id,
        PaymentMethod.is_active == True,
    ).all()


@router.patch("/{method_id}/set-default", response_model=PaymentMethodOut)
def set_default(
    method_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a payment method as the default for all new invoices."""
    method = _get_owned(db, method_id, current_user.id)
    _clear_defaults(db, current_user.id)
    method.is_default = True
    db.commit()
    db.refresh(method)
    return method


@router.delete("/{method_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_method(
    method_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a payment method."""
    method = _get_owned(db, method_id, current_user.id)
    method.is_active = False
    db.commit()


# ── helpers ───────────────────────────────────────────────────────────────────

def _clear_defaults(db: Session, user_id):
    db.query(PaymentMethod).filter(
        PaymentMethod.user_id == user_id,
        PaymentMethod.is_default == True,
    ).update({"is_default": False})


def _get_owned(db: Session, method_id: UUID, user_id) -> PaymentMethod:
    method = db.query(PaymentMethod).filter(
        PaymentMethod.id == method_id,
        PaymentMethod.user_id == user_id,
        PaymentMethod.is_active == True,
    ).first()
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return method
