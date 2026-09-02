from datetime import datetime
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.token import InvalidatedToken
from app.repositories.base import BaseRepository


class TokenRepository(BaseRepository[InvalidatedToken]):
    def __init__(self):
        super().__init__(InvalidatedToken)

    async def is_blacklisted(self, db: AsyncSession, jti: str) -> bool:
        stmt = select(InvalidatedToken).where(InvalidatedToken.jti == jti)
        result = await db.execute(stmt)
        return result.scalars().first() is not None

    async def add_to_blacklist(
        self,
        db: AsyncSession,
        *,
        jti: str,
        user_id: UUID,
        token_type: str,
        expires_at: datetime,
    ) -> InvalidatedToken:
        obj_in = {
            "jti": jti,
            "user_id": user_id,
            "token_type": token_type,
            "expires_at": expires_at,
        }
        return await self.create(db, obj_in=obj_in)


token_repo = TokenRepository()
