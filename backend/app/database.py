"""Backward-compatible database exports for the application.

Prefer importing from app.core.database for new code.
"""

from app.core.database import Base, SessionLocal, engine, get_db

__all__ = ["Base", "SessionLocal", "engine", "get_db"]
