import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "DeviceOps API"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration
    # Example: postgresql+asyncpg://postgres:postgres@localhost:5432/deviceops
    DATABASE_URL: str
    
    # Redis Configuration
    # Example: redis://localhost:6379/0
    REDIS_URL: str
    
    # JWT Security
    JWT_SECRET: str
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(
        # Load from .env if present (useful for local development outside Docker)
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
