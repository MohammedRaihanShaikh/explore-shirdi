"""
Lightweight, idempotent schema migrations.

`Base.metadata.create_all` creates missing tables but never adds columns to
tables that already exist. This module adds any columns that were introduced
after the database file was first created, so existing SQLite databases are
upgraded in place instead of being destroyed and recreated.

Every check is guarded, so running this on every startup is safe.
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

# table -> {column name: ALTER clause}
_REQUIRED_COLUMNS: dict[str, dict[str, str]] = {
    "users": {
        "role": "VARCHAR(20) NOT NULL DEFAULT 'user'",
    },
}


async def run_light_migrations(engine: AsyncEngine) -> list[str]:
    """Apply any missing columns. Returns a list of human-readable actions."""
    applied: list[str] = []

    async with engine.begin() as conn:
        for table, columns in _REQUIRED_COLUMNS.items():
            existing_rows = await conn.execute(
                text(f"PRAGMA table_info({table})")
            )
            existing = {row[1] for row in existing_rows} if existing_rows else set()

            if not existing:
                # Table does not exist yet — create_all handles it with the
                # full model definition already in place.
                continue

            for column, ddl in columns.items():
                if column in existing:
                    continue
                await conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
                )
                applied.append(f"{table}.{column}")

        # Backfill any NULL roles so the admin check always has a value.
        if "role" in _REQUIRED_COLUMNS.get("users", {}):
            await conn.execute(
                text("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''")
            )

    return applied
