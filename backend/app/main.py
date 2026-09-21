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
    try:
                model_manager.load_models()
                logger.info("ML Models initialized successfully on startup.")
except Exception as e:
            logger.warning(f"ML Models startup loading notice: {str(e)}")

    yield
    logger.info("Shutting down FastAPI application...")


app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="SafeRoute AI Backend - Predictive Road Safety API",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
)

# CORS middleware configuration
origins = [str(origin) for origin in settings.CORS_ORIGINS] if settings.CORS_ORIGINS else ["*"]
app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if origins else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
)

# Trusted Host Middleware
if settings.ALLOWED_HOSTS:
        app.add_middleware(
                    TrustedHostMiddleware,
                    allowed_hosts=[str(host) for host in settings.ALLOWED_HOSTS] if settings.ALLOWED_HOSTS else ["*"],
        )


# Request state and timing middleware
@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next: Any) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start_time = time.time()

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"

    logger.info(
                f"Path: {request.url.path} | Method: {request.method} | "
                f"Status: {response.status_code} | Time: {process_time:.2f}ms | "
                f"ReqID: {request_id}"
    )
    return response


# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.status_code,
                    "message": exc.detail,
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
            },
        )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "message": "Validation Error",
                    "details": exc.errors(),
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
            },
        )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"Unhandled exception [ReqID: {request_id}]: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "message": "Internal Server Error",
                    "request_id": request_id,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
            },
        )


# Root & Health Check Endpoints
@app.get("/", tags=["Health"])
async def root() -> dict[str, Any]:
        return {
                    "name": settings.PROJECT_NAME,
                    "version": settings.VERSION,
                    "environment": settings.ENVIRONMENT,
                    "status": "online",
                    "docs_url": "/docs",
        }


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, Any]:
        db_status = "unhealthy"
        try:
                    async with engine.connect() as conn:
                                    await conn.execute(text("SELECT 1"))
                                    db_status = "healthy"
        except Exception as e:
                    logger.error(f"Health check DB ping failed: {str(e)}")

        models_loaded = model_manager.is_ready()

    return {
                "status": "healthy" if db_status == "healthy" else "degraded",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "components": {
                                "database": db_status,
                                "ml_engine": "healthy" if models_loaded else "not_loaded",
                },
    }


# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)
