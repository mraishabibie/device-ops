import os
import urllib.parse
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "DeviceOps API"
    API_V1_STR: str = "/api/v1"
    
    # Database Configuration
    DATABASE_URL: str | None = None
    POSTGRES_SERVER: str = "db"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "deviceops"
    
    # Redis Configuration
    # Example: redis://localhost:6379/0
    REDIS_URL: str
    
    # JWT Security
    JWT_SECRET: str
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @model_validator(mode="after")
    def assemble_db_connection(self) -> "Settings":
        if not self.DATABASE_URL:
            # Automatically URL-encode the password to handle special characters safely
            encoded_password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{encoded_password}"
                f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        else:
            # If DATABASE_URL is provided, make sure the password portion is safely URL-encoded
            try:
                if "://" in self.DATABASE_URL:
                    scheme, rest = self.DATABASE_URL.split("://", 1)
                    if "@" in rest:
                        userinfo_host, path_query = rest.split("/", 1) if "/" in rest else (rest, "")
                        userinfo, host = userinfo_host.rsplit("@", 1)
                        if ":" in userinfo:
                            username, password = userinfo.split(":", 1)
                            decoded_password = urllib.parse.unquote(password)
                            encoded_password = urllib.parse.quote_plus(decoded_password)
                            self.DATABASE_URL = f"{scheme}://{username}:{encoded_password}@{host}/{path_query}"
            except Exception:
                pass
        return self

    model_config = SettingsConfigDict(
        # Load from .env if present (useful for local development outside Docker)
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
