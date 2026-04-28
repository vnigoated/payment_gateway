from app.config import settings

redis = None

if settings.UPSTASH_REDIS_REST_URL:
    from upstash_redis import Redis
    redis = Redis(
        url=settings.UPSTASH_REDIS_REST_URL,
        token=settings.UPSTASH_REDIS_REST_TOKEN,
    )
