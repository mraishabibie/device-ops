import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.redis import check_redis_health

logger = logging.getLogger("deviceops.health")
router = APIRouter()


@router.get("/live", status_code=status.HTTP_200_OK)
async def liveness_check():
    """Liveness probe. Returns 200 if the app process is running."""
    return {"status": "ok", "message": "Liveness check passed"}


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe. Checks external system dependencies (database & redis)."""
    db_ok = False
    redis_ok = False
    
    # Check Database connection
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"Database readiness check failed: {e}")
        
    # Check Redis connection
    redis_ok = await check_redis_health()
    
    if not db_ok or not redis_ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "fail",
                "database": "ok" if db_ok else "fail",
                "redis": "ok" if redis_ok else "fail"
            }
        )
        
    return {
        "status": "ok",
        "database": "ok",
        "redis": "ok",
        "message": "Readiness check passed"
    }


@router.get("/health", status_code=status.HTTP_200_OK)
@router.get("/healthz", status_code=status.HTTP_200_OK)
async def health_check():
    """Simple health check endpoint returning generic process stats."""
    return {"status": "ok", "service": "DeviceOps API"}
