import json
from typing import Any
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://saferoute_user:secure_dev_password@localhost:5432/saferoute_db"
    )
    JWT_SECRET_KEY: str = Field(
        default="d76a26df85764d084df8da987c88b5ecf0000000000000000000000000000000"
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)
    CORS_ORIGINS: list[str] = Field(default=["http://localhost:5173"])
    HOST: str = Field(default="127.0.0.1")
    ACTIVE_REGION: str = Field(default="delhi_ncr")
    DATASET_PROVENANCE_MODE: str = Field(default="RESEARCH_REAL")
    GEMINI_API_KEY: str = Field(default="")
    VERSION: str = Field(default="1.0.0")

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(item) for item in parsed]
            except Exception:
                return [item.strip() for item in v.split(",") if item.strip()]
        return v

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = ["development", "testing", "production"]
        if v not in allowed:
            raise ValueError(
                f"ENVIRONMENT must be one of {allowed}, received '{v}'"
            )
        return v

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str, info: Any) -> str:
        # If in production, prevent default weak secret keys
        env = info.data.get("ENVIRONMENT", "development")
        default_weak = "d76a26df85764d084df8da987c88b5ecf0000000000000000000000000000000"
        if env == "production" and (v == default_weak or len(v) < 32):
            raise ValueError(
                "JWT_SECRET_KEY must be a unique, secure secret of at least 32 characters in production."
            )
        return v


settings = Settings()
