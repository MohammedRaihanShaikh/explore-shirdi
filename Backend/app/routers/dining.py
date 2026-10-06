"""
Dining/Prasadam booking routes with full validation.
All bookings are tied to the authenticated user and saved to SQLite.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.models import DiningBooking, User, BookingStatus, Payment, PaymentStatus
from app.schemas import (
    DiningBookingCreateRequest,
    DiningBookingResponse,
    DiningBookingWithPayment,
    PaymentOrderResponse,
    MessageResponse,
)
from app.routers.auth import get_current_user
from app.services.auth_service import generate_booking_ref
from app.services.catalog import DINING_CATALOG
from app.services.razorpay import create_order
from app.services.upi import build_upi_intent
from app.config import settings

router = APIRouter(prefix="/dining", tags=["Dining Bookings"])


async def _load_dining(db: AsyncSession) -> dict[str, dict]:
    """
    Resolve the active dining catalog from the in-memory catalog.
    """
    return dict(DINING_CATALOG)


@router.get("/catalog")
async def get_dining_catalog(db: AsyncSession = Depends(get_db)):
    """Get all available dining options with pricing (server-authoritative)."""
    catalog = await _load_dining(db)
    return [{"id": dining_id, **info} for dining_id, info in catalog.items()]


@router.post("/book", response_model=DiningBookingWithPayment, status_code=201)
async def book_dining(
    data: DiningBookingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Book a dining/prasadam option for the authenticated user.

    Creates a PENDING booking and a Razorpay order. The booking only becomes
    CONFIRMED after the payment signature is verified via
    `POST /api/payments/verify` (for paid items) or instantly for free items.
    """
    # Resolve the dining option from the SERVER-side catalog (never trusts the client).
    catalog = await _load_dining(db)
    if data.dining_id not in catalog:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid dining ID '{data.dining_id}'. Valid options: {list(catalog.keys())}"
        )

    dining_info = catalog[data.dining_id]

    # Validate guests
    if data.num_guests < 1 or data.num_guests > 10:
        raise HTTPException(status_code=400, detail="Number of guests must be between 1 and 10.")

    # Compute price on the SERVER from the catalog — never trust a client-sent total.
    if dining_info["is_free"]:
        total_price = 0.0
    else:
        total_price = float(data.num_guests * dining_info["price_per_guest"])

    if data.total_price is not None and abs(data.total_price - total_price) > 0.01:
        print(
            f"[Dining] Price mismatch ignored: client={data.total_price} "
            f"server={total_price} (dining={data.dining_id}, guests={data.num_guests})"
        )

    booking_ref = generate_booking_ref("DIN")

    # For free items, create booking without payment order
    if dining_info["is_free"]:
        booking = DiningBooking(
            user_id=current_user.id,
            dining_id=data.dining_id,
            dining_name=dining_info["name"],
            num_guests=data.num_guests,
            total_price=total_price,
            status=BookingStatus.CONFIRMED,  # Free items are instantly confirmed
            booking_ref=booking_ref,
            special_requests=data.special_requests,
        )
        db.add(booking)
        await db.commit()
        await db.refresh(booking)

        print(
            f"[Dining] Free booking {booking.booking_ref} for user_id={current_user.id} "
            f"({current_user.full_name}) — instantly confirmed"
        )

        # Return a mock payment order for free items (frontend handles this)
        return DiningBookingWithPayment(
            booking=DiningBookingResponse.model_validate(booking),
            payment=PaymentOrderResponse(
                order_id="",
                amount=0,
                currency="INR",
                key_id="",
                mock=True,
                receipt=booking_ref,
                upi_intent="",
                upi_id="",
            ),
        )

    # For paid items, create the Razorpay order first
    try:
        order = await create_order(
            amount=total_price,
            receipt=booking_ref,
            notes={
                "dining_id": data.dining_id,
                "dining_name": dining_info["name"],
                "user_email": current_user.email,
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not create a payment order: {exc}",
        )

    # Booking stays PENDING until the payment signature is verified.
    booking = DiningBooking(
        user_id=current_user.id,
        dining_id=data.dining_id,
        dining_name=dining_info["name"],
        num_guests=data.num_guests,
        total_price=total_price,
        status=BookingStatus.PENDING,
        booking_ref=booking_ref,
        special_requests=data.special_requests,
    )
    db.add(booking)
    await db.flush()  # assign booking.id without committing

    payment = Payment(
        entity_type="dining",
        entity_id=booking.id,
        booking_ref=booking_ref,
        user_id=current_user.id,
        amount=total_price,
        currency="INR",
        razorpay_order_id=order["id"],
        status=PaymentStatus.CREATED,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(booking)

    print(
        f"[Dining] Pending booking {booking.booking_ref} for user_id={current_user.id} "
        f"({current_user.full_name}) — awaiting payment {order['id']}"
    )

    return DiningBookingWithPayment(
        booking=DiningBookingResponse.model_validate(booking),
        payment=PaymentOrderResponse(
            order_id=order["id"],
            amount=total_price,
            currency=order.get("currency", "INR"),
            key_id=settings.razorpay_key_id,
            mock=bool(order.get("mock", False)),
            receipt=booking_ref,
            upi_intent=build_upi_intent(total_price, booking_ref),
            upi_id=settings.merchant_upi_id,
        ),
    )


@router.get("/my-bookings", response_model=List[DiningBookingResponse])
async def get_my_dining_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all dining bookings for the currently logged-in user."""
    result = await db.execute(
        select(DiningBooking)
        .where(DiningBooking.user_id == current_user.id)
        .order_by(DiningBooking.created_at.desc())
    )
    return [DiningBookingResponse.model_validate(b) for b in result.scalars().all()]


@router.delete("/{booking_id}", response_model=MessageResponse)
async def cancel_dining(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a specific dining booking (only the booking owner can cancel)."""
    result = await db.execute(
        select(DiningBooking).where(
            DiningBooking.id == booking_id,
            DiningBooking.user_id == current_user.id
        )
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking is already cancelled.")

    booking.status = BookingStatus.CANCELLED
    db.add(booking)
    await db.commit()
    return MessageResponse(message=f"Booking {booking.booking_ref} cancelled successfully.")