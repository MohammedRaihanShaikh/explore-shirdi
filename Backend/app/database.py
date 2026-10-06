"""
Async SQLAlchemy database engine setup.
Uses SQLite (aiosqlite) for local development.
Switch DATABASE_URL in .env to PostgreSQL for production.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import logging

logger = logging.getLogger("shirdi.database")


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def _build_engine():
    url = settings.database_url
    if url.startswith("sqlite"):
        return create_async_engine(
            url,
            echo=False,
            connect_args={"check_same_thread": False},
        )
    # PostgreSQL / other
    return create_async_engine(
        url,
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )


engine = _build_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    """FastAPI dependency: yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"[Database] Tables ready - using: {engine.url.drivername}")
    print(f"[Database] Tables ready - using: {engine.url.drivername}")
