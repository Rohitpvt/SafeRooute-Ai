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
from app.database import engine
from app.database import engine, Base
from app.logging_config import logger
from app.routers import api_router

from contextlib import asynccontextmanager
from ml.model_manager import model_manager

# Ensure all models are loaded for table metadata registration
import app.models.user  # noqa: F401
import app.models.prediction  # noqa: F401
import app.models.hazard  # noqa: F401
import app.models.audit  # noqa: F401
import app.models.safety_alert  # noqa: F401

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up FastAPI application: Initializing database tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Database schema auto-creation notice: {str(e)}")

    logger.info("Loading ML model artifacts...")
    try:
        model_manager.load_artifacts()
    except Exception as e:
        logger.critical(f"FastAPI startup blocked. ML artifacts failed to load: {str(e)}")
        # Fail fast during startup in production, but let testing framework proceed
        if settings.ENVIRONMENT == "production":
            raise SystemExit(1)
    yield
    logger.info("Shutting down FastAPI application...")

app = FastAPI(
    title="SafeRoute AI API Gateway",
    description="Backend API services layout for predicting road accident hotspots.",
    version=settings.VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

app.include_router(api_router, prefix="/api")


# Server uptime monitor base timestamp
START_TIME = time.time()

# CORS Configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host configurations
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"],
)



from app.utils.responses import build_api_response


# Secure Headers Middleware
@app.middleware("http")
async def secure_headers_middleware(request: Request, call_next: Any) -> Response:
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), microphone=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://maps.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: https://maps.gstatic.com https://*.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "frame-ancestors 'none';"
    )
    if settings.ENVIRONMENT == "production" or request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


# Request Logging Middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next: Any) -> Response:
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()

    logger.info(
        f"Inbound Request: ID={request_id} Method={request.method} Path={request.url.path} IP={request.client.host if request.client else 'unknown'}"
    )

    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Request-ID"] = request_id
        logger.info(
            f"Outbound Response: ID={request_id} Status={response.status_code} Latency={process_time:.4f}s"
        )
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(
            f"Failed Request: ID={request_id} Latency={process_time:.4f}s Error={str(e)}"
        )
        raise e


# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.warning(f"Validation Exception: ID={request_id} Errors={exc.errors()}")
    return build_api_response(
        success=False,
        message="Request payload validation failed.",
        errors=exc.errors(),
        status_code=status.HTTP_400_BAD_REQUEST,
        request_id=request_id,
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.warning(f"HTTP Exception: ID={request_id} Status={exc.status_code} Detail={exc.detail}")
    return build_api_response(
        success=False,
        message=str(exc.detail),
        status_code=exc.status_code,
        request_id=request_id,
    )


@app.exception_handler(Exception)
async def unknown_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(f"Uncaught Exception: ID={request_id} Detail={str(exc)}", exc_info=True)
    return build_api_response(
        success=False,
        message="An unexpected system error occurred. Please contact administrator.",
        errors=str(exc) if settings.ENVIRONMENT != "production" else None,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=request_id,
    )


# Expanded Health Check Endpoint
@app.get("/api/v1/health", tags=["system"])
async def health_check(request: Request) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    db_status = "healthy"
    
    try:
        # Probe DB connection using a simple query
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = "unhealthy"
        logger.error(f"Healthcheck Database connection probe failed: {str(e)}")

    uptime = time.time() - START_TIME
    data = {
        "api_status": "healthy" if db_status == "healthy" else "degraded",
        "database_status": db_status,
        "application_version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": round(uptime, 2),
    }

    status_code = status.HTTP_200_OK if db_status == "healthy" else status.HTTP_500_INTERNAL_SERVER_ERROR
    return build_api_response(
        success=(db_status == "healthy"),
        message="System health check report resolved.",
        data=data,
        status_code=status_code,
        request_id=request_id,
    )
