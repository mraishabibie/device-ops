import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.endpoints import health, auth, companies, users, devices, dashboard
from app.core.database import AsyncSessionLocal
from app.models.company import Company
from app.services.company import company_service
from app.services.user import user_service
from app.schemas.company import CompanyCreate
from app.schemas.user import UserCreate
from sqlalchemy import select

# Setup logger
setup_logging()
logger = logging.getLogger("deviceops.main")

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Core backend services for DeviceOps SaaS",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Parse CORS origins
backend_cors_origins_str = os.getenv("BACKEND_CORS_ORIGINS")
if backend_cors_origins_str:
    cors_origins = [origin.strip() for origin in backend_cors_origins_str.split(",") if origin.strip()]
    cors_origin_regex = None
else:
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    # Allow localhost on any port and sslip.io subdomains on any port
    cors_origin_regex = r"https?://(localhost|127\.0\.0\.1|.*\.sslip\.io)(:\d+)?"

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Router endpoints under API V1 Prefix
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(companies.router, prefix=f"{settings.API_V1_STR}/companies", tags=["Companies"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Users"])
app.include_router(devices.router, prefix=f"{settings.API_V1_STR}/devices", tags=["Devices"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "Welcome to DeviceOps SaaS API foundation. All services are initialized.",
        "data": {
            "version": "0.1.0"
        }
    }


@app.on_event("startup")
async def bootstrap_database():
    """Automatic bootstrap to create a default Company and Owner user if empty"""
    async with AsyncSessionLocal() as db:
        try:
            # Check if any company exists
            result = await db.execute(select(Company).limit(1))
            company = result.scalar_one_or_none()
            if not company:
                logger.info("No companies found in database. Initializing automatic bootstrap...")
                # Create default company
                company_in = CompanyCreate(
                    name="Default Workspace",
                    slug="default",
                    contact_email="admin@deviceops.co"
                )
                company = await company_service.create_company(db, obj_in=company_in)
                
                # Create default owner user
                user_in = UserCreate(
                    email="admin@deviceops.co",
                    full_name="Default Owner",
                    password="Password123!",
                    role="OWNER"
                )
                await user_service.create_user(db, obj_in=user_in, company_id=company.id)
                await db.commit()
                logger.info("Automatic database bootstrap completed successfully.")
                logger.info("Default Company: Default Workspace (slug: default)")
                logger.info("Default Owner: admin@deviceops.co / Password123!")
            else:
                logger.info("Database already contains data. Checking default timezone updates...")
                # Automatic timezone migration: update 'UTC' default to 'Asia/Jakarta'
                result = await db.execute(select(Company))
                companies_list = result.scalars().all()
                updated = False
                for comp in companies_list:
                    if comp.timezone == "UTC":
                        comp.timezone = "Asia/Jakarta"
                        db.add(comp)
                        updated = True
                if updated:
                    await db.commit()
                    logger.info("Updated existing UTC companies timezone to Asia/Jakarta.")
                else:
                    logger.info("No timezone updates required.")
        except Exception as e:
            await db.rollback()
            logger.warning(
                f"Could not bootstrap database (tables may not exist yet or database is unreachable): {e}"
            )
