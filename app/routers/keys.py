from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.api_key import APIKey
from app.models.user import User
from app.schemas.api_key import APIKeyCreate, APIKeyCreated, APIKeyOut
from app.utils.security import generate_api_key, get_current_user

router = APIRouter(prefix="/keys", tags=["API Keys"])


@router.post("", response_model=APIKeyCreated, status_code=status.HTTP_201_CREATED)
def create_key(
    payload: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new API key. The raw key is returned **once** — store it securely.
    Subsequent requests only show the prefix (e.g. inv_a1b2c3d4).
    """
    raw_key, key_prefix, key_hash = generate_api_key()

    api_key = APIKey(
        user_id=current_user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=payload.name,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return APIKeyCreated(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        is_active=api_key.is_active,
        usage_count=api_key.usage_count,
        last_used_at=api_key.last_used_at,
        created_at=api_key.created_at,
        raw_key=raw_key,
    )


@router.get("", response_model=list[APIKeyOut])
def list_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all your API keys."""
    return db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.is_active == True,
    ).all()


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_key(
    key_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke (soft-delete) an API key."""
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id,
    ).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    db.commit()
