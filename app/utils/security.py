import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas.user import TokenData

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
api_key_header = HTTPBearer(auto_error=False)


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = expire
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return TokenData(user_id=user_id)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ── API key helpers ───────────────────────────────────────────────────────────

def generate_api_key() -> tuple[str, str, str]:
    """
    Returns (raw_key, key_prefix, key_hash).
    raw_key  — shown to user once, never stored
    key_prefix — first 12 chars, stored for display in dashboard
    key_hash   — SHA-256 hash, stored in DB for lookup
    """
    random_part = secrets.token_hex(32)
    raw_key = f"inv_{random_part}"
    key_prefix = raw_key[:12]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    return raw_key, key_prefix, key_hash


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


# ── FastAPI dependency: get current user from JWT ────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models.user import User
    token_data = decode_access_token(token)
    user = db.query(User).filter(User.id == token_data.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ── FastAPI dependency: get current user from API key ────────────────────────

def get_user_from_api_key(
    credentials: HTTPAuthorizationCredentials = Security(api_key_header),
    db: Session = Depends(get_db),
):
    from app.models.api_key import APIKey
    from app.models.user import User

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key required")

    raw_key = credentials.credentials
    key_hash = hash_api_key(raw_key)

    api_key = db.query(APIKey).filter(
        APIKey.key_hash == key_hash,
        APIKey.is_active == True,
    ).first()

    if not api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    user = db.query(User).filter(User.id == api_key.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Update usage stats
    from datetime import datetime, timezone
    api_key.usage_count += 1
    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()

    return user, api_key


# ── FastAPI dependency: accept JWT (dashboard) OR API key (developer) ─────────

def get_user_jwt_or_key(
    credentials: HTTPAuthorizationCredentials = Security(api_key_header),
    db: Session = Depends(get_db),
):
    """
    Flexible auth used by invoice + payment routes so both the dashboard
    (JWT from login) and external developers (API key) can call them.
    Returns (user, api_key) — api_key is None when JWT is used.
    """
    from app.models.api_key import APIKey
    from app.models.user import User

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    token = credentials.credentials

    # API keys always start with "inv_"
    if token.startswith("inv_"):
        key_hash = hash_api_key(token)
        api_key = db.query(APIKey).filter(APIKey.key_hash == key_hash, APIKey.is_active == True).first()
        if not api_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
        user = db.query(User).filter(User.id == api_key.user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        api_key.usage_count += 1
        api_key.last_used_at = datetime.now(timezone.utc)
        db.commit()
        from app.utils.rate_limit import check_rate_limit
        check_rate_limit(str(api_key.id), user.plan)
        return user, api_key

    # Otherwise treat as JWT
    token_data = decode_access_token(token)
    user = db.query(User).filter(User.id == token_data.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user, None
