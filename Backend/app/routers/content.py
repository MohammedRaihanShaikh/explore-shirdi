"""
Public + pilgrim-facing content endpoints:
  GET    /api/places          — active sacred sites (admin-managed)
  GET    /api/announcements   — published announcements
  GET    /api/notifications   — published notifications for the signed-in user
  POST   /api/feedback        — submit feedback
  GET    /api/feedback/mine   — the signed-in user's own feedback

These are the read/write counterparts the admin panel manages. Nothing here
returns draft content or another user's private data.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    Announcement,
    ContentStatus,
    Feedback,
    FeedbackStatus,
    Notification,
    Place,
    User,
)
from app.routers.auth import get_current_user
from app.schemas import (
    AnnouncementResponse,
    FeedbackCreateRequest,
    FeedbackResponse,
    NotificationResponse,
    PlaceResponse,
)

router = APIRouter(tags=["Content"])


@router.get("/places", response_model=List[PlaceResponse])
async def public_places(db: AsyncSession = Depends(get_db)):
    """Active places only — draft/unpublished places are hidden from pilgrims."""
    result = await db.execute(
        select(Place).where(Place.is_active == True)  # noqa: E712
        .order_by(Place.title.asc())
    )
    return list(result.scalars().all())


@router.get("/announcements", response_model=List[AnnouncementResponse])
async def public_announcements(db: AsyncSession = Depends(get_db)):
    """Published announcements for the public site."""
    result = await db.execute(
        select(Announcement)
        .where(Announcement.status == ContentStatus.PUBLISHED)
        .order_by(Announcement.created_at.desc())
        .limit(20)
    )
    return [AnnouncementResponse.model_validate(a) for a in result.scalars().all()]


@router.get("/notifications", response_model=List[NotificationResponse])
async def my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Published notifications addressed to everyone or to regular users."""
    audience = ["all", "admins"] if (current_user.role or "user") == "admin" else ["all", "users"]
    result = await db.execute(
        select(Notification)
        .where(
            Notification.status == ContentStatus.PUBLISHED,
            Notification.audience.in_(audience),
        )
        .order_by(Notification.created_at.desc())
        .limit(30)
    )
    return [NotificationResponse.model_validate(n) for n in result.scalars().all()]


@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    data: FeedbackCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Store feedback against the authenticated user (never a client-sent id)."""
    row = Feedback(
        user_id=current_user.id,
        rating=data.rating,
        comment=data.comment,
        status=FeedbackStatus.NEW,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return FeedbackResponse(
        id=row.id,
        rating=int(row.rating),
        comment=row.comment,
        status=row.status.value,
        user_id=row.user_id,
        user_name=current_user.full_name,
        user_email=current_user.email,
        created_at=row.created_at,
    )


@router.get("/feedback/mine", response_model=List[FeedbackResponse])
async def my_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
    )
    return [
        FeedbackResponse(
            id=f.id,
            rating=int(f.rating),
            comment=f.comment,
            status=f.status.value,
            user_id=f.user_id,
            user_name=current_user.full_name,
            user_email=current_user.email,
            created_at=f.created_at,
        )
        for f in result.scalars().all()
    ]


@router.delete("/feedback/{feedback_id}")
async def delete_my_feedback(
    feedback_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(Feedback, feedback_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Feedback not found.")
    await db.delete(row)
    await db.commit()
    return {"message": "Feedback deleted.", "success": True}
