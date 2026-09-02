from collections.abc import Sequence
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.prediction import PredictionLog
from app.repositories.base import BaseRepository


class PredictionRepository(BaseRepository[PredictionLog]):
    def __init__(self):
        super().__init__(PredictionLog)

    async def get_by_user(
        self, db: AsyncSession, user_id: UUID, *, skip: int = 0, limit: int = 10
    ) -> Sequence[PredictionLog]:
        stmt = (
            select(PredictionLog)
            .where(PredictionLog.user_id == user_id, PredictionLog.is_deleted == False)
            .order_by(PredictionLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return result.scalars().all()


prediction_repo = PredictionRepository()
