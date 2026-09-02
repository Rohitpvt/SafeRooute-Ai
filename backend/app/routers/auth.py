import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import TokenRefreshRequest, UserCreate, UserLogin, UserResponse
from app.services.auth_service import auth_service
from app.utils.responses import build_api_response

router = APIRouter(prefix="/auth", tags=["auth"])
security_scheme = HTTPBearer()

# In-memory IP rate limiter store
rate_limit_store = defaultdict(list)


def check_rate_limit(ip: str, limit: int, window: int = 60) -> None:
    from app.config import settings
    if settings.ENVIRONMENT == "testing":
        return
    now = time.time()
    # Clean up old timestamps
    timestamps = [t for t in rate_limit_store[ip] if now - t < window]
    if len(timestamps) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Too many login/register requests from this IP address."
        )
    rate_limit_store[ip] = timestamps + [now]


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate, request: Request, db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    check_rate_limit(ip, limit=5)
    
    ua = request.headers.get("user-agent", "unknown")
    user = await auth_service.register(db, payload, ip=ip, ua=ua)
    
    response_data = UserResponse.model_validate(user).model_dump()
    request_id = getattr(request.state, "request_id", None)
    
    return build_api_response(
        success=True,
        message="User profile created successfully.",
        data=response_data,
        status_code=status.HTTP_201_CREATED,
        request_id=request_id,
    )


@router.post("/login")
async def login(
    payload: UserLogin, request: Request, db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    check_rate_limit(ip, limit=5)
    
    ua = request.headers.get("user-agent", "unknown")
    token_response = await auth_service.login(db, payload.email, payload.password, ip=ip, ua=ua)
    
    request_id = getattr(request.state, "request_id", None)
    return build_api_response(
        success=True,
        message="User authentication successful.",
        data=token_response.model_dump(),
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    
    # Extract access token from auth header
    auth_header = request.headers.get("Authorization", "")
    access_token = ""
    if auth_header.startswith("Bearer "):
        access_token = auth_header.split(" ")[1]

    await auth_service.logout(db, access_token, current_user, ip=ip, ua=ua)
    
    request_id = getattr(request.state, "request_id", None)
    return build_api_response(
        success=True,
        message="User logout completed successfully.",
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.post("/refresh")
async def refresh(
    payload: TokenRefreshRequest, request: Request, db: AsyncSession = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    check_rate_limit(ip, limit=10)
    
    ua = request.headers.get("user-agent", "unknown")
    token_response = await auth_service.refresh_tokens(db, payload.refresh_token, ip=ip, ua=ua)
    
    request_id = getattr(request.state, "request_id", None)
    return build_api_response(
        success=True,
        message="Session tokens rotated successfully.",
        data=token_response.model_dump(),
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )


@router.get("/me")
async def get_me(request: Request, current_user: User = Depends(get_current_user)):
    response_data = UserResponse.model_validate(current_user).model_dump()
    request_id = getattr(request.state, "request_id", None)
    return build_api_response(
        success=True,
        message="User profile retrieved successfully.",
        data=response_data,
        status_code=status.HTTP_200_OK,
        request_id=request_id,
    )
