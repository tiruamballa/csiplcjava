"""Application settings and environment configuration."""

import os
import secrets
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

_raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./java_for_dsa.db").strip()
if _raw_db_url.startswith("postgres://"):
    _raw_db_url = _raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif _raw_db_url.startswith("postgresql://") and "+psycopg2" not in _raw_db_url:
    _raw_db_url = _raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)


class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "").strip() or secrets.token_urlsafe(48)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    DATABASE_URL: str = _raw_db_url
    CORS_ORIGINS: list[str] = [
        o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,*").split(",") if o.strip()
    ]
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "").strip()
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith(("postgresql", "postgres"))


settings = Settings()


def today_local() -> date:
    """Today's date in the club's timezone (so 'today' flips at local midnight)."""
    return datetime.now(ZoneInfo(settings.TIMEZONE)).date()
