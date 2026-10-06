"""
Authentication service: JWT creation/verification, password hashing.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import random
import string

from app.config import settings
from app.models import User
from app.schemas import UserRegisterRequest

import bcrypt

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its hash."""
    try:
        pwd_bytes = plain_password.encode('utf-8')[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict) -> str:
    """Generate a JWT refresh token (long-lived)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises JWTError on failure."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Fetch user from database by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """Fetch user from database by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def register_user(db: AsyncSession, data: UserRegisterRequest) -> User:
    """
    Create a new user account.

    `role` is always written here, on the server. The register schema has no
    role field, so a client sending {"role": "admin"} cannot escalate privileges.
    """
    user = User(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        hashed_password=hash_password(data.password),
        devotee_type=data.devotee_type,
        role="user",
    )
    db.add(user)
    await db.flush()  # get the ID
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    """Authenticate a user by email + password. Returns None on failure."""
    user = await get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


def generate_booking_ref(prefix: str = "SHD") -> str:
    """Generate a unique booking reference like SHD-2024-AB12."""
    year = datetime.now().year
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{prefix}-{year}-{suffix}"


# ─── Password Reset Codes ──────────────────────────────────────

RESET_CODE_TTL_MINUTES = 15
RESET_MAX_ATTEMPTS = 5


def _hash_code(email: str, code: str) -> str:
    """One-way hash of a reset code (never stored in plain text)."""
    import hashlib
    raw = f"{email.lower()}|{code}|{settings.secret_key}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def generate_reset_code() -> str:
    """Generate a 6-digit numeric recovery code."""
    return f"{random.randint(0, 999999):06d}"


async def create_password_reset(db: AsyncSession, email: str) -> Optional[str]:
    """
    Invalidate old codes for this email and store a new one.
    Returns the plain code (caller decides how to deliver it).
    """
    from app.models import PasswordReset

    email = email.strip().lower()
    # Invalidate outstanding codes
    result = await db.execute(
        select(PasswordReset).where(PasswordReset.email == email, PasswordReset.used == False)
    )
    for row in result.scalars().all():
        row.used = True

    code = generate_reset_code()
    db.add(
        PasswordReset(
            email=email,
            code_hash=_hash_code(email, code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESET_CODE_TTL_MINUTES),
            used=False,
        )
    )
    await db.flush()
    return code


async def consume_password_reset(db: AsyncSession, email: str, code: str) -> tuple[bool, str]:
    """
    Validate and consume a recovery code.
    Returns (ok, reason). Reason is only meaningful when ok is False.
    """
    from app.models import PasswordReset

    email = email.strip().lower()
    result = await db.execute(
        select(PasswordReset)
        .where(PasswordReset.email == email, PasswordReset.used == False)
        .order_by(PasswordReset.created_at.desc())
    )
    row = result.scalars().first()
    if not row:
        return False, "Invalid or expired recovery code. Please request a new one."

    if row.attempts >= RESET_MAX_ATTEMPTS:
        row.used = True
        await db.flush()
        return False, "Too many attempts. Please request a new recovery code."

    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        row.used = True
        await db.flush()
        return False, "Recovery code has expired. Please request a new one."

    if row.code_hash != _hash_code(email, code):
        row.attempts = (row.attempts or 0) + 1
        await db.flush()
        return False, "Incorrect recovery code."

    row.used = True
    await db.flush()
    return True, "ok"
