from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
from app.logging_config import logger

# Convert standard postgresql URIs to asyncpg variant if needed
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

logger.info(f"Database engine configuring connection parameters against DB target URL.")

kwargs = {"echo": False}
if not db_url.startswith("sqlite"):
    kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_recycle": 1800,
    })
engine = create_async_engine(db_url, **kwargs)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency Injection session provider for database operations.

    Yields:
        Active AsyncSession connection context.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session rolled back due to error: {str(e)}")
            raise
        finally:
            await session.close()
            logger.debug("Database session connection closed.")
