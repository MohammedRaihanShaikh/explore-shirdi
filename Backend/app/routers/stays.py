"""
Stay/Hotel booking routes with full validation.
Verifies: dates, checkout > checkin, valid stay_id, guest/room limits.
All bookings are tied to the authenticated user and saved to SQLite.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.models import StayBooking, Stay, User, BookingStatus, Payment, PaymentStatus
from app.schemas import (
    StayBookingCreateRequest,
    StayBookingResponse,
    StayBookingWithPayment,
    PaymentOrderResponse,
    MessageResponse,
)
from app.routers.auth import get_current_user
from app.services.auth_service import generate_booking_ref
from app.services.catalog import STAYS_CATALOG
from app.services.razorpay import create_order
from app.services.upi import build_upi_intent
from app.config import settings

router = APIRouter(prefix="/stays", tags=["Stay Bookings"])


async def _load_stays(db: AsyncSession) -> dict[str, dict]:
    """
    Resolve the active stay catalog.

    The `stays` table (admin-managed, seeded from STAYS_CATALOG) is preferred
    so administrators can edit name/price/availability. If the table is empty
    or unreadable we fall back to the trusted in-memory catalog, which keeps
    booking working without a database.
    """
    try:
        result = await db.execute(select(Stay).where(Stay.is_active == True))  # noqa: E712
        rows = result.scalars().all()
    except Exception:
        rows = []

    if rows:
        return {
            row.id: {
                "name": row.name,
                "price_per_night": float(row.price_per_night),
                "location": row.location,
                "distance": row.distance,
                "category": row.category,
                "description": row.description,
                "image": row.image,
                "rating": float(row.rating or 0),
                "total_rooms": row.total_rooms,
                "amenities": row.amenities or [],
            }
            for row in rows
        }
    return dict(STAYS_CATALOG)


@router.get("/catalog")
async def get_stays_catalog(db: AsyncSession = Depends(get_db)):
    """Get all available stays with pricing (server-authoritative)."""
    catalog = await _load_stays(db)
    return [{"id": stay_id, **info} for stay_id, info in catalog.items()]


@router.post("/book", response_model=StayBookingWithPayment, status_code=201)
async def book_stay(
    data: StayBookingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Book a stay for the authenticated user.

    Creates a PENDING booking and a Razorpay order. The booking only becomes
    CONFIRMED after the payment signature is verified via
    `POST /api/payments/verify`.
    """
    # Resolve the stay from the SERVER-side catalog (never trusts the client).
    catalog = await _load_stays(db)
    if data.stay_id not in catalog:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stay ID '{data.stay_id}'. Valid options: {list(catalog.keys())}"
        )

    stay_info = catalog[data.stay_id]

    # Validate dates: checkout must be after checkin
    if data.check_out <= data.check_in:
        raise HTTPException(
            status_code=400,
            detail="Check-out date must be after check-in date."
        )

    # Validate checkin is not in the past
    now = datetime.now(timezone.utc)
    checkin_aware = data.check_in.replace(tzinfo=timezone.utc) if data.check_in.tzinfo is None else data.check_in
    checkout_aware = data.check_out.replace(tzinfo=timezone.utc) if data.check_out.tzinfo is None else data.check_out
    if checkin_aware < now:
        raise HTTPException(
            status_code=400,
            detail="Check-in date cannot be in the past."
        )

    # Validate guests
    if data.num_guests < 1 or data.num_guests > 10:
        raise HTTPException(status_code=400, detail="Number of guests must be between 1 and 10.")

    # Validate rooms
    if data.num_rooms < 1 or data.num_rooms > 5:
        raise HTTPException(status_code=400, detail="Number of rooms must be between 1 and 5.")

    # Compute price on the SERVER from the catalog — never trust a client-sent total.
    nights = max(1, (checkout_aware.date() - checkin_aware.date()).days)
    total_price = float(nights * data.num_rooms * stay_info["price_per_night"])

    if data.total_price is not None and abs(data.total_price - total_price) > 0.01:
        print(
            f"[Stays] Price mismatch ignored: client={data.total_price} "
            f"server={total_price} (stay={data.stay_id}, nights={nights}, rooms={data.num_rooms})"
        )

    booking_ref = generate_booking_ref("STY")

    # Create the Razorpay order first — if this fails we have no booking.
    try:
        order = await create_order(
            amount=total_price,
            receipt=booking_ref,
            notes={
                "stay_id": data.stay_id,
                "stay_name": stay_info["name"],
                "user_email": current_user.email,
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not create a payment order: {exc}",
        )

    # Booking stays PENDING until the payment signature is verified.
    booking = StayBooking(
        user_id=current_user.id,
        stay_id=data.stay_id,
        stay_name=stay_info["name"],
        check_in=data.check_in,
        check_out=data.check_out,
        num_guests=data.num_guests,
        num_rooms=data.num_rooms,
        total_price=total_price,
        status=BookingStatus.PENDING,
        booking_ref=booking_ref,
        special_requests=data.special_requests,
    )
    db.add(booking)
    await db.flush()  # assign booking.id without committing

    payment = Payment(
        entity_type="stay",
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
        f"[Stays] Pending booking {booking.booking_ref} for user_id={current_user.id} "
        f"({current_user.full_name}) — awaiting payment {order['id']}"
    )

    return StayBookingWithPayment(
        booking=StayBookingResponse.model_validate(booking),
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


@router.get("/my-bookings", response_model=List[StayBookingResponse])
async def get_my_stay_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all stay bookings for the currently logged-in user."""
    result = await db.execute(
        select(StayBooking)
        .where(StayBooking.user_id == current_user.id)
        .order_by(StayBooking.created_at.desc())
    )
    return [StayBookingResponse.model_validate(b) for b in result.scalars().all()]


@router.delete("/{booking_id}", response_model=MessageResponse)
async def cancel_stay(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a specific stay booking (only the booking owner can cancel)."""
    result = await db.execute(
        select(StayBooking).where(
            StayBooking.id == booking_id,
            StayBooking.user_id == current_user.id
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
