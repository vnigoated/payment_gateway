import json

from app.utils.redis_client import redis

_INVOICE_TTL = 30  # seconds


def _invoice_version(user_id: str) -> int:
    if redis is None:
        return 0
    v = redis.get(f"cache:inv:ver:{user_id}")
    return int(v) if v else 0


def get_cached_invoices(user_id: str, params_key: str) -> list | None:
    if redis is None:
        return None
    ver = _invoice_version(user_id)
    raw = redis.get(f"cache:inv:{user_id}:{ver}:{params_key}")
    return json.loads(raw) if raw else None


def set_cached_invoices(user_id: str, params_key: str, data: list) -> None:
    if redis is None:
        return
    ver = _invoice_version(user_id)
    redis.set(f"cache:inv:{user_id}:{ver}:{params_key}", json.dumps(data), ex=_INVOICE_TTL)


def invalidate_invoice_cache(user_id: str) -> None:
    """Bumps the version counter — all existing cached invoice queries become stale instantly."""
    if redis is None:
        return
    redis.incr(f"cache:inv:ver:{user_id}")
