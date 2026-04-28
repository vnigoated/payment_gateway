from datetime import datetime, timezone

from fastapi import HTTPException

from app.utils.redis_client import redis

# (per_minute, per_day) request limits per plan
_LIMITS: dict[str, tuple[int, int]] = {
    "free":    (30,  500),
    "starter": (60,  5_000),
    "pro":     (120, 100_000),
}


def check_rate_limit(key_id: str, plan: str) -> None:
    """
    Fixed-window rate limiter keyed by API key ID + plan.
    Raises HTTP 429 when either the per-minute or per-day limit is exceeded.
    No-op when Redis is not configured.
    """
    if redis is None:
        return

    now = datetime.now(timezone.utc)
    min_key = f"rl:min:{key_id}:{now.strftime('%Y%m%d%H%M')}"
    day_key = f"rl:day:{key_id}:{now.strftime('%Y%m%d')}"

    per_min, per_day = _LIMITS.get(plan, _LIMITS["free"])

    count_min = redis.incr(min_key)
    if count_min == 1:
        redis.expire(min_key, 60)

    count_day = redis.incr(day_key)
    if count_day == 1:
        redis.expire(day_key, 86400)

    if count_min > per_min:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {per_min} requests/minute on the {plan} plan. Upgrade to increase limits.",
        )
    if count_day > per_day:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit exceeded: {per_day} requests/day on the {plan} plan. Upgrade to increase limits.",
        )
