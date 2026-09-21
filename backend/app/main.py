import time
import uuid
from datetime import datetime
from typing import Any

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base
from app.logging_config import logger
from app.routers import api_router

from contextlib import asynccontextmanager
from ml.model_manager import model_manager

# Ensure all models are loaded for table metadata registration
import app.models.user  # noqa: F401
import app.models.prediction  # noqa: F401
import app.models.accident_record  # noqa: F401
import app.models.audit  # noqa: F401
import app.models.hotspot  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
        logger.info("Starting up FastAPI application: Initializing database tables...")
        try:
                    async with engine.begin() as conn:
                                    await conn.run_sync(Base.metadata.create_all)
                                    logger.info("Database schema initialized successfully.")
        except Exception as e:
                    logger.warning(f"Database schema auto-creation notice: {str(e)}")

        # Load ML models into memory at startup
        logger.info("Loading ML models into memory...")
        try:
                    model_manager.load_all()
                    logger.info("ML models loaded successfully.")
except Exception as e:
        logger.warning(f"Failed to pre-load ML models at startup: {e}")

    yield

    logger.info("Shutting down FastAPI application...")


app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan,
)

# CORS Middleware Configuration
if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
                    CORSMiddleware,
                    allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
                    allow_credentials=True,
                    allow_methods=["*"],
                    allow_headers=["*"],
        )

# Trusted Host Middleware (for production security)
if settings.ENVIRONMENT == "production":
        app.add_middleware(
                    TrustedHostMiddleware,
                    allowed_hosts=settings.ALLOWED_HOSTS,
        )


# Request ID and Performance Middleware
@app.middleware("http")
async def add_request_metadata(request: Request, call_next: Any) -> Response:
        request_id = str(uuid.uuid4())
        start_time = time.time()

    # Store request_id in state for access in endpoints if needed
        request.state.request_id = request_id

    try:
                response = await call_next(request)
except Exception as exc:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"Unhandled exception | request_id={request_id} | path={request.url.path} | duration={process_time:.2f}ms | error={str(exc)}"
            )
            raise exc

    process_time = (time.time() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"

    logger.info(
                f"HTTP {request.method} {request.url.path} | status={response.status_code} | duration={process_time:.2f}ms | request_id={request_id}"
    )

    return response


# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "N/A")
        logger.warning(
            f"HTTPException | status={exc.status_code} | detail={exc.detail} | path={request.url.path} | request_id={request_id}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail if isinstance(exc.detail, str) else "HTTP Exception",
                "status_code": exc.status_code,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "N/A")
        logger.warning(
            f"ValidationError | path={request.url.path} | errors={exc.errors()} | request_id={request_id}"
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "Validation Error",
                "details": exc.errors(),
                "status_code": 422,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "N/A")
        logger.error(
            f"Unhandled Global Error | path={request.url.path} | error={str(exc)} | request_id={request_id}",
            exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "status_code": 500,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )


# Health Check Endpoints
@app.get("/health", tags=["System"])
async def health_check() -> dict[str, Any]:
        """Simple liveness probe endpoint."""
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "environment": settings.ENVIRONMENT,
        }


@app.get("/health/ready", tags=["System"])
async def readiness_check() -> dict[str, Any]:
        """Readiness probe checking database connectivity."""
        db_status = "ok"
        try:
                    async with engine.connect() as conn:
                                    await conn.execute(text("SELECT 1"))
        except Exception as e:
                    logger.error(f"Readiness check database connection failed: {e}")
                    db_status = "unavailable"

        models_loaded = True
        try:
                    if not model_manager.models:
                                    models_loaded = False
        except Exception:
                    models_loaded = False

        is_ready = db_status == "ok"

    return {
                "status": "ready" if is_ready else "not_ready",
                "database": db_status,
                "ml_models_loaded": models_loaded,
                "timestamp": datetime.utcnow().isoformat(),
    }


# Include API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
