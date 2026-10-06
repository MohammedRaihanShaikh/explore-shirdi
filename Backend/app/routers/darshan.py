"""
Darshan Pass booking routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import DarshanPass, PassType, User, BookingStatus, Payment, PaymentStatus
from app.schemas import (
    DarshanPassCreateRequest,
    DarshanPassResponse,
    DarshanPassWithPayment,
    PaymentOrderResponse,
    MessageResponse,
)
from app.routers.auth import get_current_user
from app.services.auth_service import generate_booking_ref
from app.services.razorpay import create_order
from app.services.upi import build_upi_intent
from app.config import settings

router = APIRouter(prefix="/darshan", tags=["Darshan Passes"])

# Pricing map
PASS_PRICES = {
    PassType.GENERAL: 0.0,
    PassType.VIP: 200.0,
    PassType.SENIOR_WHEELCHAIR: 0.0,
    PassType.ABHISHEK_PUJA: 500.0,
}


@router.post("/book", response_model=DarshanPassWithPayment, status_code=201)
async def book_darshan_pass(
    data: DarshanPassCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Book a darshan pass for the current user.

    Free pass types (general, senior/wheelchair) are confirmed immediately.
    Paid types (vip, abhishek_puja) create a PENDING pass plus a Razorpay
    order, and are only confirmed after payment verification.
    """
    amount = PASS_PRICES.get(data.pass_type, 0.0) * max(1, data.num_devotees)
    booking_ref = generate_booking_ref("DRS")

    # Free passes need no payment — confirm straight away.
    if amount <= 0:
        pass_obj = DarshanPass(
            user_id=current_user.id,
            pass_type=data.pass_type,
            visit_date=data.visit_date,
            num_devotees=data.num_devotees,
            status=BookingStatus.CONFIRMED,
            booking_ref=booking_ref,
            price_paid=0.0,
            gate_number=data.gate_number,
        )
        db.add(pass_obj)
        await db.commit()
        await db.refresh(pass_obj)
        return DarshanPassWithPayment(
            pass_=DarshanPassResponse.model_validate(pass_obj),
            payment=PaymentOrderResponse(
                order_id="",
                amount=0.0,
                currency="INR",
                key_id="",
                mock=False,
                receipt=booking_ref,
                upi_intent="",
                upi_id="",
            ),
        )

    # Paid pass — create the Razorpay order before anything is persisted.
    try:
        order = await create_order(
            amount=amount,
            receipt=booking_ref,
            notes={
                "pass_type": data.pass_type.value,
                "num_devotees": str(data.num_devotees),
                "user_email": current_user.email,
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not create a payment order: {exc}",
        )

    pass_obj = DarshanPass(
        user_id=current_user.id,
        pass_type=data.pass_type,
        visit_date=data.visit_date,
        num_devotees=data.num_devotees,
        status=BookingStatus.PENDING,
        booking_ref=booking_ref,
        price_paid=amount,
        gate_number=data.gate_number,
    )
    db.add(pass_obj)
    await db.flush()

    payment = Payment(
        entity_type="darshan",
        entity_id=pass_obj.id,
        booking_ref=booking_ref,
        user_id=current_user.id,
        amount=amount,
        currency="INR",
        razorpay_order_id=order["id"],
        status=PaymentStatus.CREATED,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(pass_obj)

    return DarshanPassWithPayment(
        pass_=DarshanPassResponse.model_validate(pass_obj),
        payment=PaymentOrderResponse(
            order_id=order["id"],
            amount=amount,
            currency=order.get("currency", "INR"),
            key_id=settings.razorpay_key_id,
            mock=bool(order.get("mock", False)),
            receipt=booking_ref,
            upi_intent=build_upi_intent(amount, booking_ref),
            upi_id=settings.merchant_upi_id,
        ),
    )


@router.get("/my-passes", response_model=List[DarshanPassResponse])
async def get_my_passes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all darshan passes booked by the current user."""
    result = await db.execute(
        select(DarshanPass)
        .where(DarshanPass.user_id == current_user.id)
        .order_by(DarshanPass.created_at.desc())
    )
    passes = result.scalars().all()
    return [DarshanPassResponse.model_validate(p) for p in passes]


@router.get("/{pass_id}", response_model=DarshanPassResponse)
async def get_pass_by_id(
    pass_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific darshan pass."""
    result = await db.execute(
        select(DarshanPass).where(
            DarshanPass.id == pass_id,
            DarshanPass.user_id == current_user.id
        )
    )
    pass_obj = result.scalar_one_or_none()
    if not pass_obj:
        raise HTTPException(status_code=404, detail="Pass not found.")
    return DarshanPassResponse.model_validate(pass_obj)


@router.delete("/{pass_id}", response_model=MessageResponse)
async def cancel_pass(
    pass_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a darshan pass."""
    result = await db.execute(
        select(DarshanPass).where(
            DarshanPass.id == pass_id,
            DarshanPass.user_id == current_user.id
        )
    )
    pass_obj = result.scalar_one_or_none()
    if not pass_obj:
        raise HTTPException(status_code=404, detail="Pass not found.")
    from app.models import BookingStatus
    pass_obj.status = BookingStatus.CANCELLED
    db.add(pass_obj)
    await db.commit()
    return MessageResponse(message="Pass cancelled successfully.")
