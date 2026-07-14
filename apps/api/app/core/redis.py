import logging
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger("deviceops.redis")

# Initialize global redis pool
redis_client: redis.Redis = redis.from_url(
    settings.REDIS_URL,
    decode_responses=True
)


async def check_redis_health() -> bool:
    """Verifies that Redis is reachable and responsive"""
    try:
        await redis_client.ping()
        return True
    except Exception as e:
        logger.error(f"Redis connection health check failed: {e}")
        return False
