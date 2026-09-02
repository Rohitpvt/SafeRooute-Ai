import asyncio
import os
os.environ["ENVIRONMENT"] = "testing"

from collections.abc import AsyncGenerator, Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.database import Base, get_db
from app.main import app

# Use local SQLite file for testing so tables persist across session connections
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DATABASE_URL)
TestingSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db(event_loop) -> Generator[None, None, None]:
    # Setup test tables synchronously
    async def create_tables() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def drop_tables() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    event_loop.run_until_complete(create_tables())
    yield
    event_loop.run_until_complete(drop_tables())

    # Remove SQLite file if exists
    if os.path.exists("test.db"):
        try:
            os.remove("test.db")
        except Exception:
            pass


@pytest.fixture
def client(event_loop) -> Generator[TestClient, None, None]:
    # Create isolated database session for each test run
    session = event_loop.run_until_complete(TestingSessionLocal().__aenter__())

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        test_client.db_session = session
        yield test_client
    app.dependency_overrides.clear()

    event_loop.run_until_complete(session.close())
