"""Backward-compatible config exports for the application.

Prefer importing from app.core.config for new code.
"""

from app.core.config import Settings, settings, today_local

__all__ = ["Settings", "settings", "today_local"]
