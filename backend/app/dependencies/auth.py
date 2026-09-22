import jwt
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.repositories.user import user_repo
from app.repositories.token import token_repo
from app.security.jwt import decode_token

# OAuth2 schema configuration point to Login endpoint path
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_optional_user(
    token: str | None = Depends(oauth2_scheme_optional), db: AsyncSession = Depends(get_db)
) -> User | None:
    """Optional dependency validator returning active User context if valid JWT provided, else None."""
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id_str: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        token_type: str | None = payload.get("token_type")

        if user_id_str is None or jti is None or token_type != "access":
            return None
            
        user_id = UUID(user_id_str)
        if await token_repo.is_blacklisted(db, jti):
            return None

        user = await user_repo.get(db, user_id)
        if user is None or not user.is_active:
            return None
        return user
    except Exception:
        return None


async def get_current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency validator resolving active user context from JWT tokens.

    Raises:
        HTTPException: HTTP 401 for invalid credentials, expired token, or blacklisted token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token)
        user_id_str: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        token_type: str | None = payload.get("token_type")

        if user_id_str is None or jti is None or token_type != "access":
            raise credentials_exception
            
        user_id = UUID(user_id_str)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise credentials_exception

    # Check blacklist for JTI
    if await token_repo.is_blacklisted(db, jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has been invalidated. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await user_repo.get(db, user_id)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated."
        )
    return user


class RoleChecker:
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to access resource."
            )
        return current_user


# Authorization dependencies instances
require_user = RoleChecker([UserRole.USER, UserRole.ADMIN])
require_admin = RoleChecker([UserRole.ADMIN])
