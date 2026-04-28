import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserLogin, UserOut
from app.services.email_service import EmailService
from app.utils.security import (
    create_access_token, get_current_user, hash_password, verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Signup / Login ────────────────────────────────────────────────────────────

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        business_name=payload.business_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Profile update ────────────────────────────────────────────────────────────

class UserUpdate(BaseModel):
    name: str | None = None
    business_name: str | None = None
    gstin: str | None = None
    address: str | None = None
    phone: str | None = None


@router.patch("/profile", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Password reset ────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


_RESET_MSG = {"message": "If that email is registered you will receive a reset link shortly."}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    from app.utils.redis_client import redis
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if not user:
        return _RESET_MSG  # don't reveal whether email exists

    if redis is None:
        raise HTTPException(503, detail="Password reset is temporarily unavailable")

    token = secrets.token_urlsafe(32)
    redis.set(f"pwd_reset:{token}", str(user.id), ex=3600)

    reset_url = f"{settings.APP_URL}/reset-password?token={token}"
    EmailService.send_password_reset(user.email, reset_url)
    return _RESET_MSG


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    from app.utils.redis_client import redis
    if len(payload.new_password) < 8:
        raise HTTPException(400, detail="Password must be at least 8 characters")

    if redis is None:
        raise HTTPException(503, detail="Password reset is temporarily unavailable")

    user_id = redis.get(f"pwd_reset:{payload.token}")
    if not user_id:
        raise HTTPException(400, detail="Reset link is invalid or has expired")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(400, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    redis.delete(f"pwd_reset:{payload.token}")
    return {"message": "Password updated successfully. You can now log in."}
