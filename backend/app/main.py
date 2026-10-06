import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models  # noqa: F401  (registers tables with SQLAlchemy)
from app.core.config import settings
from app.core.database import Base, engine
from app.migrations import run_migrations
from app.routers import admin, assignments, attendance, auth, public, students

logger = logging.getLogger("java_for_dsa")

# 1) add any new columns to an existing database (additive + safe), 2) create missing tables.
run_migrations(engine)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Java for Problem Solving Skills API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,  # we use Bearer tokens, not cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    """Turn Pydantic errors into {detail, errors:{field: message}} for friendly form messages."""
    errors: dict[str, str] = {}
    for err in exc.errors():
        field = str(err["loc"][-1]) if err["loc"] else "body"
        msg = err["msg"].removeprefix("Value error, ")
        if err["type"] in ("missing", "string_too_short"):
            msg = "This field is required."
        errors.setdefault(field, msg)
    return JSONResponse(
        status_code=422,
        content={"detail": "Please fix the highlighted fields and try again.", "errors": errors},
    )


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server."})


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(assignments.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(public.router)


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "app": "Java for Problem Solving Skills API"}