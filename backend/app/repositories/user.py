from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        stmt = select(User).where(User.email == email, User.is_deleted == False)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def update_login_timestamp(self, db: AsyncSession, user: User) -> None:
        user.last_login_at = datetime.utcnow()
        user.failed_login_attempts = 0
        user.lockout_until = None
        db.add(user)
        await db.flush()

    async def register_failed_login(self, db: AsyncSession, user: User, lockout_minutes: int = 15) -> None:
        user.failed_login_attempts += 1
        user.last_failed_login_at = datetime.utcnow()
        if user.failed_login_attempts >= 5:
            from datetime import timedelta
            user.lockout_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
        db.add(user)
        await db.flush()
        
    async def reset_lockout(self, db: AsyncSession, user: User) -> None:
        user.failed_login_attempts = 0
        user.lockout_until = None
        db.add(user)
        await db.flush()


user_repo = UserRepository()
