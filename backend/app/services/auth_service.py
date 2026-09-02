from uuid import UUID
from datetime import datetime, timedelta
import jwt
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.repositories.user import user_repo
from app.repositories.token import token_repo
from app.repositories.audit import audit_repo
from app.schemas.user import UserCreate, TokenResponse
from app.security.password import hash_password, verify_password
from app.security.jwt import create_jwt_token, decode_token
from app.logging_config import logger


class AuthService:
    async def register(self, db: AsyncSession, obj_in: UserCreate, ip: str | None = None, ua: str | None = None) -> User:
        # Check duplicate emails
        existing_user = await user_repo.get_by_email(db, obj_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address is already registered."
            )

        hashed = hash_password(obj_in.password)
        db_payload = {
            "full_name": obj_in.full_name,
            "email": obj_in.email,
            "password_hash": hashed,
            "role": UserRole.USER,
            "is_active": True,
            "is_verified": False,
        }
        
        user = await user_repo.create(db, obj_in=db_payload)
        
        # Log Audit event
        await audit_repo.create(
            db,
            obj_in={
                "user_id": user.id,
                "action": "registration",
                "ip_address": ip,
                "user_agent": ua,
            }
        )
        logger.info(f"User registration completed: {user.email}")
        return user

    async def login(
        self, db: AsyncSession, email: str, password: str, ip: str | None = None, ua: str | None = None
    ) -> TokenResponse:
        credentials_error = HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )

        user = await user_repo.get_by_email(db, email)
        if not user:
            # Audit log for failed login attempt (unknown user doesn't have ID, but we log action)
            await audit_repo.create(
                db,
                obj_in={
                    "user_id": None,
                    "action": f"login_failure_unknown_user: {email}",
                    "ip_address": ip,
                    "user_agent": ua,
                }
            )
            raise credentials_error

        # Check account Lockout status
        if user.lockout_until and user.lockout_until > datetime.utcnow():
            lockout_remaining = int((user.lockout_until - datetime.utcnow()).total_seconds() / 60) + 1
            await audit_repo.create(
                db,
                obj_in={
                    "user_id": user.id,
                    "action": "login_failure_locked_out",
                    "ip_address": ip,
                    "user_agent": ua,
                }
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is temporarily locked due to multiple failed login attempts. Try again in {lockout_remaining} minutes."
            )

        # Verify password matches hash
        if not verify_password(password, user.password_hash):
            await user_repo.register_failed_login(db, user, lockout_minutes=15)
            await audit_repo.create(
                db,
                obj_in={
                    "user_id": user.id,
                    "action": "login_failure",
                    "ip_address": ip,
                    "user_agent": ua,
                }
            )
            raise credentials_error

        # Reset failed login count and update timestamp
        await user_repo.update_login_timestamp(db, user)

        # Issue access & refresh tokens
        access_token, _, access_exp = create_jwt_token(
            subject=str(user.id),
            email=user.email,
            role=user.role.value,
            token_type="access",
            expires_delta=timedelta(minutes=15),
        )
        refresh_token, _, refresh_exp = create_jwt_token(
            subject=str(user.id),
            email=user.email,
            role=user.role.value,
            token_type="refresh",
            expires_delta=timedelta(days=7),
        )

        # Log Audit login success event
        await audit_repo.create(
            db,
            obj_in={
                "user_id": user.id,
                "action": "login_success",
                "ip_address": ip,
                "user_agent": ua,
            }
        )
        logger.info(f"User login success: {user.email}")
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            role=user.role,
            expires_in=900,  # 15 minutes in seconds
        )

    async def refresh_tokens(
        self, db: AsyncSession, refresh_token: str, ip: str | None = None, ua: str | None = None
    ) -> TokenResponse:
        token_error = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token."
        )

        try:
            payload = decode_token(refresh_token)
            user_id_str: str | None = payload.get("sub")
            jti: str | None = payload.get("jti")
            token_type: str | None = payload.get("token_type")

            if user_id_str is None or jti is None or token_type != "refresh":
                raise token_error
            
            # Check if refresh token has been blacklisted (already rotated)
            if await token_repo.is_blacklisted(db, jti):
                raise token_error
        except jwt.ExpiredSignatureError:
            raise token_error
        except jwt.PyJWTError:
            raise token_error

        user = await user_repo.get(db, UUID(user_id_str))
        if not user or not user.is_active:
            raise token_error

        # Invalidate old refresh token JTI immediately (Rotation!)
        exp_timestamp = payload.get("exp")
        expires_at = datetime.utcfromtimestamp(exp_timestamp) if exp_timestamp else datetime.utcnow()
        await token_repo.add_to_blacklist(
            db,
            jti=jti,
            user_id=user.id,
            token_type="refresh",
            expires_at=expires_at,
        )

        # Issue new Access & Refresh tokens
        new_access_token, _, _ = create_jwt_token(
            subject=str(user.id),
            email=user.email,
            role=user.role.value,
            token_type="access",
            expires_delta=timedelta(minutes=15),
        )
        new_refresh_token, _, _ = create_jwt_token(
            subject=str(user.id),
            email=user.email,
            role=user.role.value,
            token_type="refresh",
            expires_delta=timedelta(days=7),
        )

        await audit_repo.create(
            db,
            obj_in={
                "user_id": user.id,
                "action": "token_refresh",
                "ip_address": ip,
                "user_agent": ua,
            }
        )
        logger.info(f"User token refresh rotation completed: {user.email}")
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            role=user.role,
            expires_in=900,
        )

    async def logout(
        self, db: AsyncSession, access_token: str, user: User, ip: str | None = None, ua: str | None = None
    ) -> None:
        try:
            payload = decode_token(access_token)
            jti = payload.get("jti")
            exp_timestamp = payload.get("exp")
            expires_at = datetime.utcfromtimestamp(exp_timestamp) if exp_timestamp else datetime.utcnow()
            
            # Invalidate access token
            if jti:
                await token_repo.add_to_blacklist(
                    db,
                    jti=jti,
                    user_id=user.id,
                    token_type="access",
                    expires_at=expires_at,
                )
        except Exception as e:
            logger.warning(f"Error blacklisting access token JTI on logout: {str(e)}")

        await audit_repo.create(
            db,
            obj_in={
                "user_id": user.id,
                "action": "logout",
                "ip_address": ip,
                "user_agent": ua,
            }
        )
        logger.info(f"User logout complete: {user.email}")


auth_service = AuthService()
