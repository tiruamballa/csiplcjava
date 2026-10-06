"""Central configuration. All secrets come from environment variables / .env."""
import os
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./java_for_dsa.db")
    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()
    ]
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")


settings = Settings()

if len(settings.SECRET_KEY) < 32 or settings.SECRET_KEY.startswith("replace-me"):
    raise RuntimeError(
        "SECRET_KEY is missing or too weak. Set a random value of 32+ characters in backend/.env"
    )


def today_local() -> date:
    """Today's date in the club's timezone (so 'today' flips at local midnight)."""
    return datetime.now(ZoneInfo(settings.TIMEZONE)).date()
