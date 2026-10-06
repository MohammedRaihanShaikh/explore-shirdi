"""
Aarti reminder routes: Enable WhatsApp/SMS alerts before Aartis.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import AartiReminder, User
from app.schemas import ReminderCreateRequest, ReminderResponse, MessageResponse
from app.routers.auth import get_current_user

router = APIRouter(prefix="/reminders", tags=["Aarti Reminders"])

VALID_AARTIS = ["Kakad Aarti", "Madhyan Aarti", "Dhoop Aarti", "Shej Aarti"]


@router.post("/enable", response_model=ReminderResponse, status_code=201)
async def enable_reminder(
    data: ReminderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enable an Aarti reminder for the current user."""
    if data.aarti_name not in VALID_AARTIS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Aarti name. Valid: {VALID_AARTIS}"
        )
    reminder = AartiReminder(
        user_id=current_user.id,
        aarti_name=data.aarti_name,
        remind_minutes_before=data.remind_minutes_before,
        via_whatsapp=data.via_whatsapp,
        via_sms=data.via_sms,
    )
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return ReminderResponse.model_validate(reminder)


@router.get("/", response_model=List[ReminderResponse])
async def get_my_reminders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all active reminders for the current user."""
    result = await db.execute(
        select(AartiReminder)
        .where(AartiReminder.user_id == current_user.id, AartiReminder.is_active == True)
    )
    return [ReminderResponse.model_validate(r) for r in result.scalars().all()]


@router.delete("/{reminder_id}", response_model=MessageResponse)
async def disable_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disable a specific reminder."""
    result = await db.execute(
        select(AartiReminder).where(
            AartiReminder.id == reminder_id,
            AartiReminder.user_id == current_user.id
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found.")
    reminder.is_active = False
    db.add(reminder)
    await db.commit()
    return MessageResponse(message="Reminder disabled.")
