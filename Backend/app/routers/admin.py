"""
Explore Shirdi — Administrator API.

Security model
--------------
Every route in this module is gated by ``require_admin``:

    get_current_user()  ->  verifies the JWT and loads the row from SQLite
    require_admin()     ->  checks row.role == "admin", else 403

The role is read from the database, never from the request body, the JWT
claims, localStorage or an email address. Clients cannot grant themselves
admin by sending {"role": "admin"} — register/update schemas ignore that key.

Updates only ever write an explicit allow-list of fields, so password hashes,
tokens and roles can never be modified by passing an unexpected JSON key.
"""
from datetime import datetime, timedelta
from math import ceil
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    AartiReminder,
    Announcement,
    BookingStatus,
    ContentStatus,
    DarshanPass,
    DiningBooking,
    Feedback,
    FeedbackStatus,
    Itinerary,
    Notification,
    PassType,
    Payment,
    PaymentStatus,
    Place,
    Stay,
    StayBooking,
    User,
)
from app.routers.auth import require_admin
from app.schemas import (
    AdminActiveStatusRequest,
    AdminBookingResponse,
    AdminDarshanResponse,
    AdminDashboardResponse,
    AdminPaymentResponse,
    AdminStatusRequest,
    AdminUserResponse,
    AdminUserUpdateRequest,
    AnnouncementCreateRequest,
    AnnouncementResponse,
    FeedbackResponse,
    MessageResponse,
    NotificationCreateRequest,
    NotificationResponse,
    PaginatedResponse,
    PlaceCreateRequest,
    PlaceResponse,
    PlaceUpdateRequest,
    StayCreateRequest,
    StayResponse,
    StayUpdateRequest,
    VerifyUtrRequest,
)

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)

VALID_BOOKING_STATUSES = {"pending", "confirmed", "cancelled", "completed"}
VALID_FEEDBACK_STATUSES = {"new", "reviewed", "resolved"}


# ─── Shared helpers ──────────────────────────────────────

def _utcnow() -> datetime:
    """Naive UTC now — matches SQLite's CURRENT_TIMESTAMP storage format."""
    return datetime.now().replace(microsecond=0)


def _naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Strip tzinfo so mixed naive/aware datetimes can be compared safely."""
    if dt is None:
        return None
    return dt.replace(tzinfo=None) if dt.tzinfo is not None else dt


async def _count(db: AsyncSession, model, *where) -> int:
    q = select(func.count()).select_from(model)
    if where:
        q = q.where(*where)
    return int((await db.execute(q)).scalar_one() or 0)


async def _group_count(db: AsyncSession, column, *where) -> dict:
    q = select(column, func.count()).group_by(column)
    if where:
        q = q.where(*where)
    return {row[0]: int(row[1]) for row in (await db.execute(q)).all()}


def _paginate(total: int, page: int, per_page: int) -> dict:
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, ceil(total / per_page)) if per_page else 1,
    }


def _require_status(raw: str, allowed: set[str], label: str) -> str:
    value = (raw or "").strip().lower()
    if value not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {label} '{raw}'. Allowed: {sorted(allowed)}",
        )
    return value


def _not_found(what: str) -> HTTPException:
    return HTTPException(status_code=404, detail=f"{what} not found.")


# ─── Dashboard ───────────────────────────────────────────

@router.get("/dashboard", response_model=AdminDashboardResponse)
async def admin_dashboard(db: AsyncSession = Depends(get_db)):
    """Real statistics aggregated straight from SQLite."""
    week_ago = _utcnow() - timedelta(days=7)
    now = _utcnow()

    booking_status_counts = await _group_count(db, StayBooking.status)
    darshan_status_counts = await _group_count(db, DarshanPass.status)
    reminder_counts = await _group_count(db, AartiReminder.is_active)

    revenue = await db.execute(select(func.coalesce(func.sum(StayBooking.total_price), 0.0)))
    revenue = float(revenue.scalar_one() or 0.0)

    avg_rating = await db.execute(select(func.avg(Feedback.rating)))
    avg_rating_raw = avg_rating.scalar_one()

    # ── Recent activity, assembled from real rows only ──
    activity: list[dict[str, Any]] = []

    for u in (await db.execute(
        select(User).order_by(User.created_at.desc()).limit(6)
    )).scalars():
        activity.append({
            "type": "user_registered",
            "title": f"New user registered: {u.full_name}",
            "detail": u.email,
            "at": _naive(u.created_at),
        })

    for b in (await db.execute(
        select(StayBooking).order_by(StayBooking.created_at.desc()).limit(6)
    )).scalars():
        verb = "cancelled" if b.status == BookingStatus.CANCELLED else "booked"
        activity.append({
            "type": "stay_booking",
            "title": f"Stay {verb}: {b.stay_name} ({b.booking_ref})",
            "detail": f"{b.num_guests} guest(s) · Rs.{b.total_price:,.0f}",
            "at": _naive(b.created_at),
        })

    for d in (await db.execute(
        select(DarshanPass).order_by(DarshanPass.created_at.desc()).limit(6)
    )).scalars():
        verb = "cancelled" if d.status == BookingStatus.CANCELLED else "booked"
        activity.append({
            "type": "darshan_pass",
            "title": f"Darshan pass {verb}: {d.booking_ref}",
            "detail": f"{d.pass_type.name.replace('_', ' ').title()} · {d.num_devotees} devotee(s)",
            "at": _naive(d.created_at),
        })

    for f in (await db.execute(
        select(Feedback).order_by(Feedback.created_at.desc()).limit(4)
    )).scalars():
        activity.append({
            "type": "feedback",
            "title": f"Feedback submitted ({f.rating}/5)",
            "detail": f.comment[:90],
            "at": _naive(f.created_at),
        })

    for a in (await db.execute(
        select(Announcement).order_by(Announcement.created_at.desc()).limit(4)
    )).scalars():
        if a.status == ContentStatus.PUBLISHED:
            activity.append({
                "type": "announcement",
                "title": f"Announcement published: {a.title}",
                "detail": a.message[:90],
                "at": _naive(a.created_at),
            })

    activity = [a for a in activity if a["at"] is not None]
    activity.sort(key=lambda a: a["at"], reverse=True)
    activity = activity[:10]

    return AdminDashboardResponse(
        total_users=await _count(db, User),
        new_users_7d=await _count(db, User, User.created_at >= week_ago),
        total_bookings=await _count(db, StayBooking),
        pending_bookings=int(booking_status_counts.get(BookingStatus.PENDING, 0)),
        confirmed_bookings=int(booking_status_counts.get(BookingStatus.CONFIRMED, 0)),
        cancelled_bookings=int(booking_status_counts.get(BookingStatus.CANCELLED, 0)),
        completed_bookings=int(booking_status_counts.get(BookingStatus.COMPLETED, 0)),
        booking_revenue=revenue,
        total_stays=await _count(db, Stay),
        active_stays=await _count(db, Stay, Stay.is_active == True),  # noqa: E712
        total_places=await _count(db, Place),
        active_places=await _count(db, Place, Place.is_active == True),  # noqa: E712
        total_darshan_passes=await _count(db, DarshanPass),
        upcoming_darshan_passes=int(darshan_status_counts.get(BookingStatus.PENDING, 0))
        + int(darshan_status_counts.get(BookingStatus.CONFIRMED, 0)),
        cancelled_darshan_passes=int(darshan_status_counts.get(BookingStatus.CANCELLED, 0)),
        total_feedback=await _count(db, Feedback),
        average_rating=round(float(avg_rating_raw), 2) if avg_rating_raw is not None else None,
        total_itineraries=await _count(db, Itinerary),
        total_reminders=await _count(db, AartiReminder),
        active_reminders=int(reminder_counts.get(True, 0)),
        recent_activity=activity,
    )


# ─── Users ───────────────────────────────────────────────

@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    search: Optional[str] = Query(None, max_length=100),
    role: Optional[str] = Query(None, pattern="^(user|admin)$"),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(active|inactive)$"),
    sort: str = Query("created_desc", pattern="^(created_desc|created_asc|name_asc|name_desc|email_asc)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search, filter, sort and page through registered users (server-side)."""
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(User.full_name.ilike(term), User.email.ilike(term), User.phone.ilike(term)))
    if role:
        filters.append(User.role == role)
    if status_filter == "active":
        filters.append(User.is_active == True)  # noqa: E712
    elif status_filter == "inactive":
        filters.append(User.is_active == False)  # noqa: E712

    total = await _count(db, User, *filters)

    order_by = {
        "created_desc": User.created_at.desc(),
        "created_asc": User.created_at.asc(),
        "name_asc": User.full_name.asc(),
        "name_desc": User.full_name.desc(),
        "email_asc": User.email.asc(),
    }[sort]

    result = await db.execute(
        select(User).where(*filters).order_by(order_by, User.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    users = result.scalars().all()

    ids = [u.id for u in users]
    booking_counts: dict[int, int] = {}
    darshan_counts: dict[int, int] = {}
    if ids:
        booking_counts = await _group_count(db, StayBooking.user_id, StayBooking.user_id.in_(ids))
        darshan_counts = await _group_count(db, DarshanPass.user_id, DarshanPass.user_id.in_(ids))

    items = [
        AdminUserResponse(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            phone=u.phone,
            role=u.role or "user",
            devotee_type=u.devotee_type,
            is_active=bool(u.is_active),
            is_verified=bool(u.is_verified),
            whatsapp_alerts=bool(u.whatsapp_alerts),
            sms_alerts=bool(u.sms_alerts),
            booking_count=booking_counts.get(u.id, 0),
            darshan_count=darshan_counts.get(u.id, 0),
            created_at=u.created_at,
        )
        for u in users
    ]

    return PaginatedResponse(items=items, **_paginate(total, page, per_page))


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise _not_found("User")
    booking_counts = await _group_count(db, StayBooking.user_id, StayBooking.user_id == user_id)
    darshan_counts = await _group_count(db, DarshanPass.user_id, DarshanPass.user_id == user_id)
    return AdminUserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        role=user.role or "user",
        devotee_type=user.devotee_type,
        is_active=bool(user.is_active),
        is_verified=bool(user.is_verified),
        whatsapp_alerts=bool(user.whatsapp_alerts),
        sms_alerts=bool(user.sms_alerts),
        booking_count=booking_counts.get(user_id, 0),
        darshan_count=darshan_counts.get(user_id, 0),
        created_at=user.created_at,
    )


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a user's profile using an explicit allow-list.

    `role`, `is_active` and `hashed_password` are not in the schema, so they
    can never be written here even if the request body contains them.
    """
    user = await db.get(User, user_id)
    if not user:
        raise _not_found("User")

    allowed = data.model_dump(exclude_none=True)
    for field, value in allowed.items():
        setattr(user, field, value)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await get_user(user_id, db)


@router.patch("/users/{user_id}/status", response_model=AdminUserResponse)
async def set_user_status(
    user_id: int,
    data: AdminActiveStatusRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate an account without deleting historical bookings."""
    if user_id == admin.id and not data.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    user = await db.get(User, user_id)
    if not user:
        raise _not_found("User")
    user.is_active = data.is_active
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await get_user(user_id, db)


# ─── Bookings ────────────────────────────────────────────

async def _booking_to_response(db: AsyncSession, b: StayBooking, name: str, email: str) -> AdminBookingResponse:
    # Fetch payment details for this booking
    payment_result = await db.execute(
        select(Payment).where(
            Payment.entity_type == "stay",
            Payment.entity_id == b.id,
        )
    )
    payment = payment_result.scalar_one_or_none()
    
    payment_status = None
    payment_method = None
    utr = None
    paid_at = None
    
    if payment:
        payment_status = payment.status.value if isinstance(payment.status, PaymentStatus) else str(payment.status)
        if payment.razorpay_signature == "UTR":
            payment_method = "upi"
            utr = payment.razorpay_payment_id
        elif payment.razorpay_payment_id:
            payment_method = "razorpay"
        paid_at = payment.updated_at
    
    return AdminBookingResponse(
        id=b.id,
        booking_ref=b.booking_ref,
        user_id=b.user_id,
        user_name=name,
        user_email=email,
        stay_id=b.stay_id,
        stay_name=b.stay_name,
        check_in=b.check_in,
        check_out=b.check_out,
        num_guests=b.num_guests,
        num_rooms=b.num_rooms,
        total_price=float(b.total_price),
        status=b.status.value if isinstance(b.status, BookingStatus) else str(b.status),
        special_requests=b.special_requests,
        created_at=b.created_at,
        payment_status=payment_status,
        payment_method=payment_method,
        utr=utr,
        paid_at=paid_at,
    )


async def _booking_user_map(db: AsyncSession, bookings) -> dict[int, User]:
    ids = {b.user_id for b in bookings}
    if not ids:
        return {}
    rows = (await db.execute(select(User).where(User.id.in_(ids)))).scalars().all()
    return {u.id: u for u in rows}


@router.get("/bookings", response_model=PaginatedResponse)
async def list_bookings(
    search: Optional[str] = Query(None, max_length=100),
    status_filter: Optional[str] = Query(None, alias="status",
                                         pattern="^(pending|confirmed|cancelled|completed)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if status_filter:
        filters.append(StayBooking.status == BookingStatus(status_filter))
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(
            StayBooking.booking_ref.ilike(term),
            StayBooking.stay_name.ilike(term),
            StayBooking.user_id.in_(select(User.id).where(
                or_(User.full_name.ilike(term), User.email.ilike(term))
            )),
        ))

    total = await _count(db, StayBooking, *filters)
    result = await db.execute(
        select(StayBooking).where(*filters)
        .order_by(StayBooking.created_at.desc(), StayBooking.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    bookings = result.scalars().all()
    user_map = await _booking_user_map(db, bookings)

    items = [
        await _booking_to_response(
            db,
            b,
            user_map[b.user_id].full_name if b.user_id in user_map else "Deleted user",
            user_map[b.user_id].email if b.user_id in user_map else "",
        )
        for b in bookings
    ]
    return PaginatedResponse(items=items, **_paginate(total, page, per_page))


async def _get_booking_or_404(db: AsyncSession, booking_id: int) -> StayBooking:
    booking = await db.get(StayBooking, booking_id)
    if not booking:
        raise _not_found("Booking")
    return booking


@router.get("/bookings/{booking_id}", response_model=AdminBookingResponse)
async def get_booking(booking_id: int, db: AsyncSession = Depends(get_db)):
    booking = await _get_booking_or_404(db, booking_id)
    user = await db.get(User, booking.user_id)
    return await _booking_to_response(db, booking, user.full_name if user else "Deleted user",
                                user.email if user else "")


@router.patch("/bookings/{booking_id}/status", response_model=AdminBookingResponse)
async def set_booking_status(
    booking_id: int,
    data: AdminStatusRequest,
    db: AsyncSession = Depends(get_db),
):
    """Confirm / cancel / complete a stay booking (writes straight to SQLite)."""
    value = _require_status(data.status, VALID_BOOKING_STATUSES, "booking status")
    booking = await _get_booking_or_404(db, booking_id)
    booking.status = BookingStatus(value)
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    user = await db.get(User, booking.user_id)
    return await _booking_to_response(db, booking, user.full_name if user else "Deleted user",
                                user.email if user else "")


# ─── Stays ───────────────────────────────────────────────

async def _stay_response(db: AsyncSession, stay: Stay) -> StayResponse:
    counts = await _group_count(db, StayBooking.stay_id, StayBooking.stay_id == stay.id)
    return StayResponse(
        id=stay.id,
        name=stay.name,
        description=stay.description,
        location=stay.location,
        distance=stay.distance,
        category=stay.category,
        price_per_night=float(stay.price_per_night),
        total_rooms=stay.total_rooms,
        rating=float(stay.rating or 0),
        amenities=stay.amenities,
        image=stay.image,
        is_active=bool(stay.is_active),
        booking_count=counts.get(stay.id, 0),
        created_at=stay.created_at,
    )


@router.get("/stays", response_model=list[StayResponse])
async def list_stays(db: AsyncSession = Depends(get_db)):
    stays = (await db.execute(select(Stay).order_by(Stay.name.asc()))).scalars().all()
    return [await _stay_response(db, s) for s in stays]


@router.post("/stays", response_model=StayResponse, status_code=status.HTTP_201_CREATED)
async def create_stay(data: StayCreateRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.get(Stay, data.id)
    if existing:
        raise HTTPException(status_code=400, detail=f"A stay with id '{data.id}' already exists.")
    stay = Stay(**data.model_dump())
    db.add(stay)
    await db.commit()
    await db.refresh(stay)
    return await _stay_response(db, stay)


@router.get("/stays/{stay_id}", response_model=StayResponse)
async def get_stay(stay_id: str, db: AsyncSession = Depends(get_db)):
    stay = await db.get(Stay, stay_id)
    if not stay:
        raise _not_found("Stay")
    return await _stay_response(db, stay)


@router.put("/stays/{stay_id}", response_model=StayResponse)
async def update_stay(stay_id: str, data: StayUpdateRequest, db: AsyncSession = Depends(get_db)):
    stay = await db.get(Stay, stay_id)
    if not stay:
        raise _not_found("Stay")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(stay, field, value)
    db.add(stay)
    await db.commit()
    await db.refresh(stay)
    return await _stay_response(db, stay)


@router.patch("/stays/{stay_id}/status", response_model=StayResponse)
async def set_stay_status(
    stay_id: str, data: AdminActiveStatusRequest, db: AsyncSession = Depends(get_db)
):
    """Publish / unpublish a stay. Deactivating removes it from booking only."""
    stay = await db.get(Stay, stay_id)
    if not stay:
        raise _not_found("Stay")
    stay.is_active = data.is_active
    db.add(stay)
    await db.commit()
    await db.refresh(stay)
    return await _stay_response(db, stay)


# ─── Places ──────────────────────────────────────────────

@router.get("/places", response_model=list[PlaceResponse])
async def list_places(db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(Place).order_by(Place.title.asc()))).scalars().all()


@router.post("/places", response_model=PlaceResponse, status_code=status.HTTP_201_CREATED)
async def create_place(data: PlaceCreateRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Place).where(Place.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"A place with slug '{data.slug}' already exists.")
    place = Place(**data.model_dump())
    db.add(place)
    await db.commit()
    await db.refresh(place)
    return place


@router.put("/places/{place_id}", response_model=PlaceResponse)
async def update_place(place_id: int, data: PlaceUpdateRequest, db: AsyncSession = Depends(get_db)):
    place = await db.get(Place, place_id)
    if not place:
        raise _not_found("Place")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(place, field, value)
    db.add(place)
    await db.commit()
    await db.refresh(place)
    return place


@router.patch("/places/{place_id}/status", response_model=PlaceResponse)
async def set_place_status(
    place_id: int, data: AdminActiveStatusRequest, db: AsyncSession = Depends(get_db)
):
    place = await db.get(Place, place_id)
    if not place:
        raise _not_found("Place")
    place.is_active = data.is_active
    db.add(place)
    await db.commit()
    await db.refresh(place)
    return place


# ─── Darshan ─────────────────────────────────────────────

def _darshan_to_response(d: DarshanPass, name: str, email: str) -> AdminDarshanResponse:
    return AdminDarshanResponse(
        id=d.id,
        booking_ref=d.booking_ref,
        user_id=d.user_id,
        user_name=name,
        user_email=email,
        pass_type=d.pass_type.value if isinstance(d.pass_type, PassType) else str(d.pass_type),
        visit_date=d.visit_date,
        num_devotees=d.num_devotees,
        status=d.status.value if isinstance(d.status, BookingStatus) else str(d.status),
        price_paid=float(d.price_paid or 0),
        gate_number=d.gate_number,
        created_at=d.created_at,
    )


@router.get("/darshan", response_model=PaginatedResponse)
async def list_darshan(
    search: Optional[str] = Query(None, max_length=100),
    status_filter: Optional[str] = Query(None, alias="status",
                                         pattern="^(pending|confirmed|cancelled|completed)$"),
    pass_type: Optional[str] = Query(None,
                                     pattern="^(general|vip|senior_wheelchair|abhishek_puja)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if status_filter:
        filters.append(DarshanPass.status == BookingStatus(status_filter))
    if pass_type:
        filters.append(DarshanPass.pass_type == PassType(pass_type))
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(
            DarshanPass.booking_ref.ilike(term),
            DarshanPass.user_id.in_(select(User.id).where(
                or_(User.full_name.ilike(term), User.email.ilike(term))
            )),
        ))

    total = await _count(db, DarshanPass, *filters)
    result = await db.execute(
        select(DarshanPass).where(*filters)
        .order_by(DarshanPass.created_at.desc(), DarshanPass.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    passes = result.scalars().all()
    user_map = await _booking_user_map(db, passes)
    items = [
        _darshan_to_response(
            p,
            user_map[p.user_id].full_name if p.user_id in user_map else "Deleted user",
            user_map[p.user_id].email if p.user_id in user_map else "",
        )
        for p in passes
    ]
    return PaginatedResponse(items=items, **_paginate(total, page, per_page))


@router.patch("/darshan/{pass_id}/status", response_model=AdminDarshanResponse)
async def set_darshan_status(pass_id: int, data: AdminStatusRequest,
                             db: AsyncSession = Depends(get_db)):
    value = _require_status(data.status, VALID_BOOKING_STATUSES, "darshan status")
    pass_obj = await db.get(DarshanPass, pass_id)
    if not pass_obj:
        raise _not_found("Darshan pass")
    pass_obj.status = BookingStatus(value)
    db.add(pass_obj)
    await db.commit()
    await db.refresh(pass_obj)
    user = await db.get(User, pass_obj.user_id)
    return _darshan_to_response(pass_obj, user.full_name if user else "Deleted user",
                                user.email if user else "")


# ─── Feedback ────────────────────────────────────────────

def _feedback_to_response(f: Feedback, name: str, email: Optional[str]) -> FeedbackResponse:
    return FeedbackResponse(
        id=f.id,
        rating=int(f.rating),
        comment=f.comment,
        status=f.status.value if isinstance(f.status, FeedbackStatus) else str(f.status),
        user_id=f.user_id,
        user_name=name,
        user_email=email,
        created_at=f.created_at,
    )


@router.get("/feedback", response_model=PaginatedResponse)
async def list_feedback(
    search: Optional[str] = Query(None, max_length=100),
    status_filter: Optional[str] = Query(None, alias="status",
                                         pattern="^(new|reviewed|resolved)$"),
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if status_filter:
        filters.append(Feedback.status == FeedbackStatus(status_filter))
    if min_rating is not None:
        filters.append(Feedback.rating >= min_rating)
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(
            Feedback.comment.ilike(term),
            Feedback.user_id.in_(select(User.id).where(
                or_(User.full_name.ilike(term), User.email.ilike(term))
            )),
        ))

    total = await _count(db, Feedback, *filters)
    result = await db.execute(
        select(Feedback).where(*filters)
        .order_by(Feedback.created_at.desc(), Feedback.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    rows = result.scalars().all()
    user_map = await _booking_user_map(db, rows)
    items = [
        _feedback_to_response(
            f,
            user_map[f.user_id].full_name if f.user_id in user_map else "Anonymous",
            user_map[f.user_id].email if f.user_id in user_map else None,
        )
        for f in rows
    ]
    return PaginatedResponse(items=items, **_paginate(total, page, per_page))


@router.patch("/feedback/{feedback_id}/status", response_model=FeedbackResponse)
async def set_feedback_status(feedback_id: int, data: AdminStatusRequest,
                              db: AsyncSession = Depends(get_db)):
    value = _require_status(data.status, VALID_FEEDBACK_STATUSES, "feedback status")
    item = await db.get(Feedback, feedback_id)
    if not item:
        raise _not_found("Feedback")
    item.status = FeedbackStatus(value)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    user = await db.get(User, item.user_id)
    return _feedback_to_response(item, user.full_name if user else "Anonymous",
                                 user.email if user else None)


# ─── Notifications ───────────────────────────────────────

@router.get("/notifications", response_model=PaginatedResponse)
async def list_notifications(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(published|draft)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = [Notification.status == ContentStatus(status_filter)] if status_filter else []
    total = await _count(db, Notification, *filters)
    result = await db.execute(
        select(Notification).where(*filters)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    items = [NotificationResponse.model_validate(n) for n in result.scalars().all()]
    return PaginatedResponse(items=items, **_paginate(total, page, per_page))


@router.post("/notifications", response_model=NotificationResponse,
             status_code=status.HTTP_201_CREATED)
async def create_notification(
    data: NotificationCreateRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    row = Notification(
        title=data.title,
        message=data.message,
        audience=data.audience,
        status=ContentStatus(data.status),
        created_by=admin.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return NotificationResponse.model_validate(row)


@router.put("/notifications/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    data: NotificationCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(Notification, notification_id)
    if not row:
        raise _not_found("Notification")
    row.title = data.title
    row.message = data.message
    row.audience = data.audience
    row.status = ContentStatus(data.status)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return NotificationResponse.model_validate(row)


# ─── Announcements ───────────────────────────────────────

@router.get("/announcements", response_model=PaginatedResponse)
async def list_announcements(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(published|draft)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = [Announcement.status == ContentStatus(status_filter)] if status_filter else []
    total = await _count(db, Announcement, *filters)
    result = await db.execute(
        select(Announcement).where(*filters)
        .order_by(Announcement.created_at.desc(), Announcement.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    items = [AnnouncementResponse.model_validate(a) for a in result.scalars().all()]
    return PaginatedResponse(items=items, **_paginate(total, page, per_page))


@router.post("/announcements", response_model=AnnouncementResponse,
             status_code=status.HTTP_201_CREATED)
async def create_announcement(
    data: AnnouncementCreateRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    row = Announcement(
        title=data.title,
        message=data.message,
        status=ContentStatus(data.status),
        created_by=admin.id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return AnnouncementResponse.model_validate(row)


@router.put("/announcements/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    data: AnnouncementCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(Announcement, announcement_id)
    if not row:
        raise _not_found("Announcement")
    row.title = data.title
    row.message = data.message
    row.status = ContentStatus(data.status)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return AnnouncementResponse.model_validate(row)


# ─── Analytics ───────────────────────────────────────────

@router.get("/analytics")
async def analytics(db: AsyncSession = Depends(get_db)):
    """Real, computed analytics. Nothing here is hardcoded."""
    now = _utcnow()

    # User growth, bucketed by month for the last 6 months.
    user_rows = (await db.execute(
        select(User.created_at).where(User.created_at.isnot(None))
    )).scalars().all()
    booking_rows = (await db.execute(
        select(StayBooking.created_at, StayBooking.status, StayBooking.total_price)
    )).all()
    feedback_rows = (await db.execute(
        select(Feedback.rating, Feedback.created_at)
    )).all()
    darshan_rows = (await db.execute(
        select(DarshanPass.pass_type, DarshanPass.status, DarshanPass.created_at)
    )).all()
    stay_rows = (await db.execute(
        select(StayBooking.stay_id, StayBooking.stay_name)
    )).all()

    def bucket(dt: Optional[datetime]) -> str:
        d = _naive(dt) or now
        return d.strftime("%Y-%m")

    months = []
    cursor = now.replace(day=1)
    for _ in range(6):
        months.append(cursor.strftime("%Y-%m"))
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    months.reverse()

    users_by_month = {m: 0 for m in months}
    for dt in user_rows:
        key = bucket(dt)
        if key in users_by_month:
            users_by_month[key] += 1

    bookings_by_month = {m: 0 for m in months}
    for dt, _status, _price in booking_rows:
        key = bucket(dt)
        if key in bookings_by_month:
            bookings_by_month[key] += 1

    status_counts = await _group_count(db, StayBooking.status)
    darshan_status_counts = await _group_count(db, DarshanPass.status)
    pass_type_counts = await _group_count(db, DarshanPass.pass_type)

    total_feedback = len(feedback_rows)
    avg_rating = round(sum(r for r, _ in feedback_rows) / total_feedback, 2) if total_feedback else None
    rating_distribution = {str(i): 0 for i in range(1, 6)}
    for rating, _dt in feedback_rows:
        rating_distribution[str(int(rating))] = rating_distribution.get(str(int(rating)), 0) + 1

    popular_stays: dict[str, dict[str, Any]] = {}
    for stay_id, stay_name in stay_rows:
        entry = popular_stays.setdefault(stay_id, {"stay_id": stay_id, "stay_name": stay_name, "bookings": 0})
        entry["bookings"] += 1
    popular_stays = sorted(popular_stays.values(), key=lambda x: x["bookings"], reverse=True)[:5]

    revenue = float(sum(p for _dt, _s, p in booking_rows))

    upcoming_passes = await db.execute(select(func.count()).select_from(DarshanPass).where(
        DarshanPass.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
    ))
    upcoming = int(upcoming_passes.scalar_one() or 0)

    return {
        "users": {
            "total": await _count(db, User),
            "new_last_7_days": await _count(db, User, User.created_at >= now - timedelta(days=7)),
            "new_last_30_days": await _count(db, User, User.created_at >= now - timedelta(days=30)),
            "admins": await _count(db, User, User.role == "admin"),
            "active": await _count(db, User, User.is_active == True),  # noqa: E712
            "by_month": [{"month": m, "count": users_by_month[m]} for m in months],
        },
        "bookings": {
            "total": len(booking_rows),
            "pending": int(status_counts.get(BookingStatus.PENDING, 0)),
            "confirmed": int(status_counts.get(BookingStatus.CONFIRMED, 0)),
            "cancelled": int(status_counts.get(BookingStatus.CANCELLED, 0)),
            "completed": int(status_counts.get(BookingStatus.COMPLETED, 0)),
            "revenue": round(revenue, 2),
            "by_month": [{"month": m, "count": bookings_by_month[m]} for m in months],
            "popular_stays": popular_stays,
        },
        "stays": {
            "total": await _count(db, Stay),
            "active": await _count(db, Stay, Stay.is_active == True),  # noqa: E712
            "inactive": await _count(db, Stay, Stay.is_active == False),  # noqa: E712
        },
        "darshan": {
            "total": len(darshan_rows),
            "upcoming": upcoming,
            "pending": int(darshan_status_counts.get(BookingStatus.PENDING, 0)),
            "confirmed": int(darshan_status_counts.get(BookingStatus.CONFIRMED, 0)),
            "cancelled": int(darshan_status_counts.get(BookingStatus.CANCELLED, 0)),
            "by_type": [
                {"type": (k.name if isinstance(k, PassType) else str(k)).replace("_", " ").title(),
                 "count": v}
                for k, v in pass_type_counts.items()
            ],
        },
        "feedback": {
            "total": total_feedback,
            "average_rating": avg_rating,
            "rating_distribution": [
                {"rating": r, "count": rating_distribution[r]} for r in sorted(rating_distribution)
            ],
            "pending_review": await _count(db, Feedback, Feedback.status == FeedbackStatus.NEW),
        },
        "content": {
            "places": await _count(db, Place),
            "announcements": await _count(db, Announcement),
            "published_announcements": await _count(
                db, Announcement, Announcement.status == ContentStatus.PUBLISHED
            ),
            "notifications": await _count(db, Notification),
            "itineraries": await _count(db, Itinerary),
            "active_reminders": await _count(db, AartiReminder, AartiReminder.is_active == True),  # noqa: E712
        },
    }


# ─── Payments ───────────────────────────────────────────────

def _payment_to_response(p: Payment, user_name: str, user_email: str, entity_name: str = "", special_requests: str = None) -> AdminPaymentResponse:
    """Convert Payment model to AdminPaymentResponse with user info and entity details."""
    # Determine payment method
    payment_method = None
    utr = None
    if p.razorpay_signature == "UTR":
        payment_method = "upi"
        utr = p.razorpay_payment_id
    elif p.razorpay_payment_id:
        payment_method = "razorpay"
    
    return AdminPaymentResponse(
        id=p.id,
        entity_type=p.entity_type,
        entity_id=p.entity_id,
        booking_ref=p.booking_ref,
        user_id=p.user_id,
        user_name=user_name,
        user_email=user_email,
        amount=float(p.amount),
        currency=p.currency,
        status=p.status.value if isinstance(p.status, PaymentStatus) else str(p.status),
        payment_method=payment_method,
        utr=utr,
        razorpay_order_id=p.razorpay_order_id,
        razorpay_payment_id=p.razorpay_payment_id,
        razorpay_signature=p.razorpay_signature,
        created_at=p.created_at,
        updated_at=p.updated_at,
        paid_at=p.updated_at if p.status == PaymentStatus.PAID else None,
        special_requests=special_requests,
    )


async def _get_entity_name_and_requests(db: AsyncSession, entity_type: str, entity_id: int) -> tuple[str, Optional[str]]:
    """Get entity name and special requests based on entity type and ID."""
    if entity_type == "stay":
        booking = await db.get(StayBooking, entity_id)
        if booking:
            return booking.stay_name, booking.special_requests
    elif entity_type == "dining":
        booking = await db.get(DiningBooking, entity_id)
        if booking:
            return booking.dining_name, booking.special_requests
    elif entity_type == "darshan":
        booking = await db.get(DarshanPass, entity_id)
        if booking:
            return f"Darshan {booking.pass_type.value if hasattr(booking.pass_type, 'value') else booking.pass_type}", None
    return "", None


@router.get("/payments", response_model=PaginatedResponse)
async def list_payments(
    search: Optional[str] = Query(None, max_length=100),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(created|paid|failed|refunded)$"),
    entity_type: Optional[str] = Query(None, pattern="^(stay|dining|darshan)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all payments with filtering and search."""
    filters = []
    if status_filter:
        filters.append(Payment.status == PaymentStatus(status_filter))
    if entity_type:
        filters.append(Payment.entity_type == entity_type)
    if search:
        term = f"%{search.strip()}%"
        filters.append(Payment.booking_ref.ilike(term))

    total = await _count(db, Payment, *filters)
    result = await db.execute(
        select(Payment).where(*filters)
        .order_by(Payment.created_at.desc(), Payment.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    payments = result.scalars().all()

    # Fetch user info and entity details for each payment
    user_ids = {p.user_id for p in payments}
    user_map = {}
    if user_ids:
        user_rows = (await db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
        user_map = {u.id: u for u in user_rows}

    items = []
    for p in payments:
        user = user_map.get(p.user_id)
        entity_name, special_requests = await _get_entity_name_and_requests(db, p.entity_type, p.entity_id)
        items.append(_payment_to_response(p, user.full_name if user else "Deleted user", user.email if user else "", entity_name, special_requests))

    return PaginatedResponse(items=items, **_paginate(total, page, per_page))


@router.get("/payments/{payment_id}", response_model=AdminPaymentResponse)
async def get_payment(payment_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed payment information."""
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise _not_found("Payment")
    
    user = await db.get(User, payment.user_id)
    entity_name, special_requests = await _get_entity_name_and_requests(db, payment.entity_type, payment.entity_id)
    
    return _payment_to_response(payment, user.full_name if user else "Deleted user", user.email if user else "", entity_name, special_requests)


@router.patch("/payments/{payment_id}/verify-utr", response_model=AdminPaymentResponse)
async def verify_utr(
    payment_id: int,
    data: VerifyUtrRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify a UPI payment by UTR number and mark as paid."""
    utr = data.utr.strip().upper()
    
    # Validate UTR format
    if len(utr) < 12 or len(utr) > 22:
        raise HTTPException(status_code=400, detail="Invalid UTR format. Must be 12-22 characters.")
    
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise _not_found("Payment")
    
    if payment.status == PaymentStatus.PAID:
        raise HTTPException(status_code=400, detail="Payment is already marked as paid.")
    
    # Update payment with UTR
    payment.status = PaymentStatus.PAID
    payment.razorpay_payment_id = utr
    payment.razorpay_signature = "UTR"
    db.add(payment)
    
    # Also confirm the underlying booking
    if payment.entity_type == "stay":
        booking = await db.get(StayBooking, payment.entity_id)
        if booking and booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.CONFIRMED
            db.add(booking)
    elif payment.entity_type == "dining":
        booking = await db.get(DiningBooking, payment.entity_id)
        if booking and booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.CONFIRMED
            db.add(booking)
    elif payment.entity_type == "darshan":
        booking = await db.get(DarshanPass, payment.entity_id)
        if booking and booking.status == BookingStatus.PENDING:
            booking.status = BookingStatus.CONFIRMED
            db.add(booking)
    
    await db.commit()
    await db.refresh(payment)
    
    user = await db.get(User, payment.user_id)
    entity_name, special_requests = await _get_entity_name_and_requests(db, payment.entity_type, payment.entity_id)
    
    return _payment_to_response(payment, user.full_name if user else "Deleted user", user.email if user else "", entity_name, special_requests)


@router.patch("/payments/{payment_id}/status", response_model=AdminPaymentResponse)
async def set_payment_status(
    payment_id: int,
    data: AdminStatusRequest,
    db: AsyncSession = Depends(get_db),
):
    """Manually set payment status (paid/failed/refunded)."""
    value = _require_status(data.status, {"paid", "failed", "refunded"}, "payment status")
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise _not_found("Payment")
    
    new_status = PaymentStatus(value)
    if new_status == PaymentStatus.PAID and payment.status != PaymentStatus.PAID:
        payment.razorpay_payment_id = payment.razorpay_payment_id or f"manual_{payment.id}"
        payment.razorpay_signature = "MANUAL"
    
    payment.status = new_status
    db.add(payment)
    
    # Update underlying booking if paid
    if new_status == PaymentStatus.PAID:
        if payment.entity_type == "stay":
            booking = await db.get(StayBooking, payment.entity_id)
            if booking and booking.status == BookingStatus.PENDING:
                booking.status = BookingStatus.CONFIRMED
                db.add(booking)
        elif payment.entity_type == "dining":
            booking = await db.get(DiningBooking, payment.entity_id)
            if booking and booking.status == BookingStatus.PENDING:
                booking.status = BookingStatus.CONFIRMED
                db.add(booking)
        elif payment.entity_type == "darshan":
            booking = await db.get(DarshanPass, payment.entity_id)
            if booking and booking.status == BookingStatus.PENDING:
                booking.status = BookingStatus.CONFIRMED
                db.add(booking)
    elif new_status == PaymentStatus.FAILED and payment.entity_type == "stay":
        # If payment failed and booking was pending, it stays pending
        pass
    
    await db.commit()
    await db.refresh(payment)
    
    user = await db.get(User, payment.user_id)
    entity_name, special_requests = await _get_entity_name_and_requests(db, payment.entity_type, payment.entity_id)
    
    return _payment_to_response(payment, user.full_name if user else "Deleted user", user.email if user else "", entity_name, special_requests)
