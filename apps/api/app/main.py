import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.endpoints import health, auth, companies, users, devices, dashboard

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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to specific domains in production configuration
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
