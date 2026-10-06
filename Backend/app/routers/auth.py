"""
Authentication routes: register, login, refresh token, logout, me.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from datetime import timedelta
from typing import Optional

from app.database import get_db
from app.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    UserResponse, UserUpdateRequest, ChangePasswordRequest, MessageResponse,
    ForgotPasswordRequest, ForgotPasswordResponse, ResetPasswordRequest,
)
from app.services.auth_service import (
    register_user, authenticate_user, get_user_by_email,
    get_user_by_id, create_access_token, create_refresh_token,
    decode_token, verify_password, hash_password,
    create_password_reset, consume_password_reset, RESET_CODE_TTL_MINUTES,
)
from app.config import settings
from app.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency to get current authenticated user from JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await get_user_by_id(db, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exception
    return user


oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


async def get_optional_current_user(
    token: str = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    """FastAPI dependency to optionally get current authenticated user if token present."""
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id:
            user = await get_user_by_id(db, int(user_id))
            if user and user.is_active:
                return user
    except Exception:
        pass
    return None


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Authorization gate for every /api/admin/* route.

    The role is read from the authenticated row in SQLite — never from the
    request body, the JWT claims, localStorage or an email address — so a
    normal user cannot reach admin data by forging any client-side value.
    """
    if (current_user.role or "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new devotee account."""
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = await register_user(db, data)
    await db.commit()
    await db.refresh(user)

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email + password."""
    user = await authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {"sub": str(user.id)}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/token", response_model=TokenResponse)
async def login_oauth2(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """OAuth2 compatible token endpoint (used by Swagger UI)."""
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    token_data = {"sub": str(user.id)}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's profile.

    Email is the login identifier, so a change is rejected when another
    account already owns it. `role`, `is_active` and `hashed_password` are not
    in the schema, so this route can never escalate privileges.
    """
    updates = data.model_dump(exclude_none=True)

    new_email = updates.get("email")
    if new_email and new_email != current_user.email:
        existing = await get_user_by_email(db, new_email)
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists."
            )
        # A new address has not been proven to belong to this pilgrim yet.
        current_user.is_verified = False

    for field, value in updates.items():
        setattr(current_user, field, value)
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change the current user's password."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )
    current_user.hashed_password = hash_password(data.new_password)
    db.add(current_user)
    await db.commit()
    return MessageResponse(message="Password changed successfully.")


class RefreshTokenRequest(BaseModel):
    """Body payload for POST /auth/refresh."""
    refresh_token: str = Field(..., min_length=10, max_length=4096)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Start account recovery: store a 6-digit code for the email.

    The response is identical whether or not the account exists, so an
    attacker cannot probe which emails are registered. In development
    (DEBUG=true) the code is returned as `dev_code` because no SMTP/Twilio
    credentials are configured — in production it would be emailed/SMSed.
    """
    generic_message = (
        "If an account exists for this email, a recovery code has been issued. "
        "It expires in 15 minutes."
    )

    user = await get_user_by_email(db, data.email)
    if not user or not user.is_active:
        return ForgotPasswordResponse(message=generic_message, dev_code=None)

    code = await create_password_reset(db, data.email)
    await db.commit()

    return ForgotPasswordResponse(
        message=generic_message,
        dev_code=code if settings.debug else None,
        expires_in_minutes=RESET_CODE_TTL_MINUTES,
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify the recovery code and set a new password."""
    ok, reason = await consume_password_reset(db, data.email, data.code)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    user = await get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    user.hashed_password = hash_password(data.new_password)
    db.add(user)
    await db.commit()

    return MessageResponse(message="Password reset successfully. You can now sign in.")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: Optional[RefreshTokenRequest] = None,
    token_query: Optional[str] = Query(None, description="Alternative to the JSON body"),
    db: AsyncSession = Depends(get_db)
):
    """Get a new access token using a valid refresh token (body or query param)."""
    refresh_jwt = payload.refresh_token if payload else token_query
    if not refresh_jwt:
        raise HTTPException(status_code=422, detail="Refresh token is required.")
    try:
        payload_data = decode_token(refresh_jwt)
        if payload_data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type.")
        user_id = payload_data.get("sub")
        user = await get_user_by_id(db, int(user_id))
        if not user:
            raise HTTPException(status_code=401, detail="User not found.")
        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            expires_in=settings.access_token_expire_minutes * 60,
            user=UserResponse.model_validate(user),
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
