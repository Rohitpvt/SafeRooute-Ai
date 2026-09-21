import time
import uuid
from datetime import datetime
from typing import Any
from contextlib import asynccontextmanager

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

        model_manager.load_models()
        yield
        logger.info("Shutting down FastAPI application...")


app = FastAPI(
        title="SafeRoute AI Backend API",
        description="Backend API for SafeRoute AI - Real-time accident prediction and route safety analytics.",
        version=settings.VERSION,
        docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
        openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
)

allowed_origins = [str(origin) for origin in settings.CORS_ORIGINS]

app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins if allowed_origins else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
)

app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"],
)


@app.middleware("http")
async def add_process_time_and_request_id(request: Request, call_next: Any) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
                    status_code=exc.status_code,
                    content={
                                    "error": exc.detail if isinstance(exc.detail, str) else "HTTP Exception",
                                    "code": exc.status_code,
                                    "timestamp": datetime.utcnow().isoformat(),
                                    "path": request.url.path,
                    },
        )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    content={
                                    "error": "Validation Error",
                                    "code": 422,
                                    "details": exc.errors(),
                                    "timestamp": datetime.utcnow().isoformat(),
                                    "path": request.url.path,
                    },
        )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled server error at {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "code": 500,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
            },
        )


@app.get("/health", tags=["Health"])
async def health_check():
        db_status = "unhealthy"
        try:
                    async with engine.connect() as conn:
                                    await conn.execute(text("SELECT 1"))
                                    db_status = "healthy"
        except Exception as e:
                    logger.warning(f"Database health check failed: {str(e)}")

        models_loaded = model_manager.is_loaded()

    return {
                "status": "healthy" if db_status == "healthy" else "degraded",
                "timestamp": datetime.utcnow().isoformat(),
                "version": settings.VERSION,
                "environment": settings.ENVIRONMENT,
                "database": db_status,
                "ml_models_loaded": models_loaded,
    }


@app.get("/", tags=["Root"])
async def root():
        return {
                    "name": "SafeRoute AI API",
                    "status": "running",
                    "version": settings.VERSION,
                    "documentation": "/docs" if settings.ENVIRONMENT != "production" else "Disabled in production",
        }


app.include_router(api_router, prefix="/api/v1")
