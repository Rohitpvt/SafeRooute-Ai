import uuid
import calendar
from datetime import datetime, timedelta
from typing import Any
import jwt
from pydantic import BaseModel
from app.config import settings


class TokenPayload(BaseModel):
    sub: str # user_id
    email: str
    role: str
    token_type: str # "access" or "refresh"
    jti: str
    exp: int


def create_jwt_token(
    *,
    subject: str,
    email: str,
    role: str,
    token_type: str,
    expires_delta: timedelta,
    jti: str | None = None,
) -> tuple[str, str, datetime]:
    """Generates a signed JWT token payload.

    Returns:
        Tuple of (token_string, jti_identifier, expiration_datetime)
    """
    now = datetime.utcnow()
    expire = now + expires_delta
    jti_str = jti or str(uuid.uuid4())
    
    # Calculate UTC epoch timestamp safely using calendar.timegm to prevent offset issues
    exp_epoch = calendar.timegm(expire.utctimetuple())
    
    payload = {
        "sub": subject,
        "email": email,
        "role": role,
        "token_type": token_type,
        "jti": jti_str,
        "exp": exp_epoch,
    }
    
    encoded = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded, jti_str, expire


def decode_token(token: str) -> dict[str, Any]:
    """Decodes a JWT token signature, returning the claims payload dictionary.

    Raises:
        jwt.ExpiredSignatureError: If token is expired.
        jwt.PyJWTError: If signature is invalid or decode fails.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
