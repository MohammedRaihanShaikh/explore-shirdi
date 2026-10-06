"""
Seeds accounts and catalog content into the database on startup (idempotent).
These give a known working login for local development and testing, and give
administrators a real, database-backed catalog to manage.
"""
import re
import warnings

from sqlalchemy import select
from app.config import settings
from app.database import AsyncSessionLocal
from app.models import User, Stay, Place, DevoteeType, UserRole
from app.services.auth_service import hash_password
from app.services.catalog import STAYS_CATALOG, PLACES_CATALOG

# Same rule the API enforces: >=8 chars with at least one letter and one digit.
_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,100}$")

# (name, email, phone, password)
DEMO_USERS = [
    {
        "full_name": "Demo Devotee",
        "email": "demo@shirdi.org",
        "phone": "+919876543210",
        "password": "Demo@1234",
        "devotee_type": DevoteeType.GENERAL,
    },
    {
        "full_name": "Sai Sevak",
        "email": "sevak@shirdi.org",
        "phone": "+919123456780",
        "password": "Sevak@1234",
        "devotee_type": DevoteeType.FAMILY,
    },
]


async def seed_demo_users() -> list[str]:
    """Create demo users if they don't already exist. Returns created emails."""
    created: list[str] = []
    async with AsyncSessionLocal() as session:
        for spec in DEMO_USERS:
            result = await session.execute(select(User).where(User.email == spec["email"]))
            if result.scalar_one_or_none():
                continue
            session.add(
                User(
                    full_name=spec["full_name"],
                    email=spec["email"],
                    phone=spec["phone"],
                    hashed_password=hash_password(spec["password"]),
                    devotee_type=spec["devotee_type"],
                    is_active=True,
                    is_verified=True,
                    role=UserRole.USER.value,
                )
            )
            created.append(spec["email"])
        await session.commit()
    return created


async def seed_admin_user() -> str | None:
    """
    Ensure exactly one administrator account exists, driven by environment
    variables (ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD).

    Returns the admin email when an account was created or corrected, else None.
    The role is assigned here, server-side — it is never accepted from a
    registration or profile payload.
    """
    email = (settings.admin_email or "").strip().lower()
    name = (settings.admin_name or "").strip() or "Platform Administrator"
    password = settings.admin_password or ""

    if not email:
        return None

    if not _PASSWORD_RE.match(password):
        warnings.warn(
            "[Shirdi] ADMIN_PASSWORD does not meet the password policy "
            "(8+ chars, 1 letter, 1 digit). The administrator account was NOT created."
        )
        return None

    created_or_fixed = False
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        admin = result.scalar_one_or_none()

        if admin is None:
            session.add(
                User(
                    full_name=name,
                    email=email,
                    hashed_password=hash_password(password),
                    is_active=True,
                    is_verified=True,
                    role=UserRole.ADMIN.value,
                )
            )
            created_or_fixed = True
        elif admin.role != UserRole.ADMIN.value:
            # An existing account was explicitly configured as the admin.
            admin.role = UserRole.ADMIN.value
            admin.is_active = True
            session.add(admin)
            created_or_fixed = True

        await session.commit()
    return email if created_or_fixed else None


async def seed_stays() -> int:
    """Insert any catalog stays that are missing. Never overwrites admin edits."""
    added = 0
    async with AsyncSessionLocal() as session:
        for stay_id, info in STAYS_CATALOG.items():
            result = await session.execute(select(Stay).where(Stay.id == stay_id))
            if result.scalar_one_or_none():
                continue
            session.add(
                Stay(
                    id=stay_id,
                    name=info["name"],
                    description=info.get("description"),
                    location=info.get("location"),
                    distance=info.get("distance"),
                    category=info.get("category"),
                    price_per_night=float(info["price_per_night"]),
                    total_rooms=int(info.get("total_rooms", 10)),
                    rating=float(info.get("rating", 0)),
                    amenities=info.get("amenities"),
                    image=info.get("image"),
                    is_active=True,
                )
            )
            added += 1
        await session.commit()
    return added


async def seed_places() -> int:
    """Insert any sacred site that is missing. Never overwrites admin edits."""
    added = 0
    async with AsyncSessionLocal() as session:
        for place in PLACES_CATALOG:
            result = await session.execute(select(Place).where(Place.slug == place["slug"]))
            if result.scalar_one_or_none():
                continue
            session.add(
                Place(
                    slug=place["slug"],
                    title=place["title"],
                    category=place["category"],
                    description=place.get("description"),
                    distance=place.get("distance"),
                    duration=place.get("duration"),
                    rating=float(place.get("rating", 0)),
                    image=place.get("image"),
                    is_active=True,
                )
            )
            added += 1
        await session.commit()
    return added
