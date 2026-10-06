"""
Payment routes (Razorpay + UPI QR).

Flow
----
1. `POST /stays/book` or `POST /darshan/book` creates a PENDING booking and
   a Razorpay order, returning the order id the frontend needs.
2. The frontend opens Razorpay Checkout and the user pays.
3. `POST /api/payments/verify` receives the payment signature, verifies it
   server-side, and only then marks the booking CONFIRMED.

UPI QR flow
-----------
1. The frontend renders a QR code from a UPI intent URL.
2. The pilgrim scans it with PhonePe/GPay/Paytm and pays.
3. `POST /api/payments/verify-upi` receives the UTR number and, once
   validated, marks the booking CONFIRMED.

The signature check in step 3 is what makes this safe: a forged or
tampered frontend response can never confirm a booking.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import (
    Payment, PaymentStatus, StayBooking, DarshanPass, DiningBooking,
    BookingStatus, User,
)
from app.routers.auth import get_current_user
from app.services.razorpay import verify_signature, fetch_payment, RazorpayError
from app.services.upi import is_valid_utr

router = APIRouter(prefix="/payments", tags=["Payments"])


class PaymentVerifyRequest(BaseModel):
    entity_type: str = Field(..., pattern=r"^(stay|darshan|dining)$")
    entity_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

    model_config = {"extra": "ignore"}


class PaymentVerifyResponse(BaseModel):
    success: bool
    message: str
    entity_type: str
    entity_id: int
    booking_ref: str
    status: str


@router.post("/verify", response_model=PaymentVerifyResponse)
async def verify_payment(
    data: PaymentVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a Razorpay payment and confirm the associated booking.

    The Razorpay signature is re-computed and compared in constant time.
    Only a matching signature moves the booking to CONFIRMED.
    """
    result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == data.razorpay_order_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Unknown payment order.")

    if payment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This payment belongs to another account.")

    if payment.entity_type != data.entity_type or payment.entity_id != data.entity_id:
        raise HTTPException(status_code=400, detail="Payment does not match this booking.")

    # Idempotent: an already-paid payment confirms again without harm.
    if payment.status == PaymentStatus.PAID:
        return PaymentVerifyResponse(
            success=True,
            message="Payment already verified.",
            entity_type=payment.entity_type,
            entity_id=payment.entity_id,
            booking_ref=payment.booking_ref,
            status=payment.status.value,
        )

    # ── Security-critical: verify the signature before trusting anything ──
    if not verify_signature(
        data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature
    ):
        payment.status = PaymentStatus.FAILED
        await db.commit()
        raise HTTPException(status_code=400, detail="Payment signature verification failed.")

    # Live mode: double-check with Razorpay that the payment is captured.
    if data.razorpay_order_id and not data.razorpay_order_id.startswith("order_mock_"):
        try:
            remote = await fetch_payment(data.razorpay_payment_id)
            if remote.get("status") not in ("captured", "authorized", "refunded"):
                payment.status = PaymentStatus.FAILED
                await db.commit()
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment not captured (status: {remote.get('status')}).",
                )
        except RazorpayError as exc:
            raise HTTPException(status_code=502, detail=str(exc))

    payment.status = PaymentStatus.PAID
    payment.razorpay_payment_id = data.razorpay_payment_id
    payment.razorpay_signature = data.razorpay_signature

    # Confirm the underlying booking.
    if payment.entity_type == "stay":
        booking = await db.get(StayBooking, payment.entity_id)
        if booking and booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.CONFIRMED
    elif payment.entity_type == "dining":
        booking = await db.get(DiningBooking, payment.entity_id)
        if booking and booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.CONFIRMED
    else:
        booking = await db.get(DarshanPass, payment.entity_id)
        if booking and booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.CONFIRMED

    await db.commit()

    return PaymentVerifyResponse(
        success=True,
        message="Payment verified. Booking confirmed.",
        entity_type=payment.entity_type,
        entity_id=payment.entity_id,
        booking_ref=payment.booking_ref,
        status=payment.status.value,
    )


class UpiVerifyRequest(BaseModel):
    entity_type: str = Field(..., pattern=r"^(stay|darshan|dining)$")
    entity_id: int
    utr: str

    model_config = {"extra": "ignore"}


@router.post("/verify-upi", response_model=PaymentVerifyResponse)
async def verify_upi_payment(
    data: UpiVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a UPI payment submitted by the pilgrim via UTR number.

    The pilgrim scanned the QR code, paid in their UPI app, and pasted the
    UTR (transaction reference) shown by the app. We validate the format,
    confirm the underlying booking, and record the UTR against it.

    Note: true UTR reconciliation requires a bank/UPI gateway feed. This
    endpoint validates ownership and format, then confirms — suitable for
    the current mock/development stage. Swap the body for a gateway
    confirmation call before accepting real money.
    """
    if not is_valid_utr(data.utr):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid UTR number (12-22 characters from your payment app).",
        )

    utr = data.utr.strip().upper()

    # Locate the pending booking and make sure it belongs to this user.
    if data.entity_type == "stay":
        booking = await db.get(StayBooking, data.entity_id)
    elif data.entity_type == "dining":
        booking = await db.get(DiningBooking, data.entity_id)
    else:
        booking = await db.get(DarshanPass, data.entity_id)

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This booking belongs to another account.")
    if booking.status != BookingStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Booking is already {booking.status.value}.",
        )

    # Record the UTR against the payment row for reconciliation.
    result = await db.execute(
        select(Payment).where(
            Payment.entity_type == data.entity_type,
            Payment.entity_id == data.entity_id,
        )
    )
    payment = result.scalar_one_or_none()
    if payment:
        payment.status = PaymentStatus.PAID
        payment.razorpay_payment_id = utr  # reuse the column to store the UTR
        payment.razorpay_signature = "UTR"

    booking.status = BookingStatus.CONFIRMED
    await db.commit()

    return PaymentVerifyResponse(
        success=True,
        message="Payment confirmed. Booking confirmed.",
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        booking_ref=booking.booking_ref,
        status=BookingStatus.CONFIRMED.value,
    )
