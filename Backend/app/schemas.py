"""
Pydantic schemas for request/response validation.
Used by FastAPI route handlers.
"""
import re
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime, date
from app.models import PassType, BookingStatus, DevoteeType


# ─── Shared Validation Helpers ─────────────────────────────

PASSWORD_RULE_MSG = (
    "Password must be at least 8 characters and include at least one letter and one number."
)

# Same rules the frontend password strength meter enforces.
_PASSWORD_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,100}$")


def _clean_name(v: str) -> str:
    """Collapse whitespace and strip a person's name."""
    cleaned = re.sub(r"\s+", " ", (v or "").strip())
    if len(cleaned) < 2:
        raise ValueError("Name must be at least 2 characters.")
    if len(cleaned) > 150:
        raise ValueError("Name must be at most 150 characters.")
    if not re.match(r"^[A-Za-z][A-Za-z .'\-]*$", cleaned):
        raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes and dots.")
    return cleaned


# ─── Auth Schemas ─────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r'^\+?[0-9]{10,15}$')
    password: str = Field(..., min_length=8, max_length=100)
    devotee_type: DevoteeType = DevoteeType.GENERAL

    # Defence in depth: a client sending {"role": "admin"} must be ignored.
    # The role column is only ever written by the startup seeding path.
    model_config = {"extra": "ignore"}

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        return _clean_name(v)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return (v or "").strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v or ""):
            raise ValueError(PASSWORD_RULE_MSG)
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return (v or "").strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    # Server-assigned authorization role ("user" | "admin"). Clients cannot set
    # this value — see the security notes in app/routers/admin.py.
    role: str = "user"
    devotee_type: DevoteeType
    is_active: bool
    is_verified: bool
    whatsapp_alerts: bool
    sms_alerts: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r'^\+?[0-9]{10,15}$')
    devotee_type: Optional[DevoteeType] = None
    whatsapp_alerts: Optional[bool] = None
    sms_alerts: Optional[bool] = None

    # `role`, `is_active`, `hashed_password` are deliberately absent so a
    # self-service profile update can never escalate privileges.
    model_config = {"extra": "ignore"}

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else _clean_name(v)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else (v or "").strip().lower()


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v or ""):
            raise ValueError(PASSWORD_RULE_MSG)
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return (v or "").strip().lower()


class ForgotPasswordResponse(BaseModel):
    message: str
    # Only populated when the API runs in debug/development mode, because
    # no SMTP/Twilio credentials are configured for local development.
    dev_code: Optional[str] = None
    expires_in_minutes: int = 15


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., pattern=r"^[0-9]{6}$")
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return (v or "").strip().lower()

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v or ""):
            raise ValueError(PASSWORD_RULE_MSG)
        return v

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return (v or "").strip()


# ─── Darshan Pass Schemas ─────────────────────────────────

class DarshanPassCreateRequest(BaseModel):
    pass_type: PassType
    visit_date: datetime
    num_devotees: int = Field(1, ge=1, le=10)
    gate_number: Optional[int] = Field(None, ge=1, le=3)

    @model_validator(mode="after")
    def validate_visit_date(self) -> "DarshanPassCreateRequest":
        from datetime import timezone
        visit = self.visit_date
        if visit.tzinfo is None:
            visit = visit.replace(tzinfo=timezone.utc)
        # Allow same-day bookings, reject any date strictly in the past.
        if visit.date() < datetime.now(timezone.utc).date():
            raise ValueError("Visit date cannot be in the past.")
        return self


class DarshanPassResponse(BaseModel):
    id: int
    pass_type: PassType
    visit_date: datetime
    num_devotees: int
    status: BookingStatus
    booking_ref: str
    price_paid: float
    gate_number: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Stay Booking Schemas ─────────────────────────────────

class StayBookingCreateRequest(BaseModel):
    stay_id: str = Field(..., min_length=1, max_length=50)
    # Optional: the server derives both from its own catalog (never trusts the client).
    stay_name: Optional[str] = Field(None, max_length=200)
    check_in: datetime
    check_out: datetime
    num_guests: int = Field(1, ge=1, le=10)
    num_rooms: int = Field(1, ge=1, le=5)
    total_price: Optional[float] = Field(None, ge=0, le=1_000_000)
    special_requests: Optional[str] = Field(None, max_length=500)

    @field_validator("stay_id")
    @classmethod
    def clean_stay_id(cls, v: str) -> str:
        return (v or "").strip().lower()

    @field_validator("special_requests")
    @classmethod
    def clean_special_requests(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned or None

    @model_validator(mode="after")
    def validate_dates(self) -> "StayBookingCreateRequest":
        if self.check_in is None or self.check_out is None:
            raise ValueError("Check-in and check-out dates are required.")
        if self.check_out <= self.check_in:
            raise ValueError("Check-out date must be after check-in date.")
        return self


class StayBookingResponse(BaseModel):
    id: int
    stay_id: str
    stay_name: str
    check_in: datetime
    check_out: datetime
    num_guests: int
    num_rooms: int
    total_price: float
    status: BookingStatus
    booking_ref: str
    special_requests: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Payment Schemas (Razorpay) ───────────────────────────

class PaymentOrderResponse(BaseModel):
    """Everything the frontend needs to open Razorpay Checkout."""
    order_id: str
    amount: float  # INR, for display
    currency: str
    key_id: str  # Razorpay key id used by the Checkout SDK
    mock: bool  # True when running without real Razorpay keys
    receipt: str
    # UPI QR flow: the intent URL to encode as a QR code. Empty when no
    # merchant UPI id is configured.
    upi_intent: str = ""
    upi_id: str = ""


class StayBookingWithPayment(BaseModel):
    """A freshly created stay booking plus the payment order for it."""
    booking: StayBookingResponse
    payment: PaymentOrderResponse


class DarshanPassWithPayment(BaseModel):
    """A freshly created darshan pass plus the payment order for it."""
    pass_: DarshanPassResponse = Field(alias="pass")
    payment: PaymentOrderResponse

    model_config = {"populate_by_name": True}


# ─── Dining Booking Schemas ────────────────────────────────

class DiningBookingCreateRequest(BaseModel):
    dining_id: str = Field(..., min_length=1, max_length=50)
    dining_name: Optional[str] = Field(None, max_length=200)
    num_guests: int = Field(1, ge=1, le=10)
    total_price: Optional[float] = Field(None, ge=0, le=1_000_000)
    special_requests: Optional[str] = Field(None, max_length=500)

    @field_validator("dining_id")
    @classmethod
    def clean_dining_id(cls, v: str) -> str:
        return (v or "").strip().lower()

    @field_validator("special_requests")
    @classmethod
    def clean_special_requests(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned or None


class DiningBookingResponse(BaseModel):
    id: int
    dining_id: str
    dining_name: str
    num_guests: int
    total_price: float
    status: BookingStatus
    booking_ref: str
    special_requests: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DiningBookingWithPayment(BaseModel):
    """A freshly created dining booking plus the payment order for it."""
    booking: DiningBookingResponse
    payment: PaymentOrderResponse


# ─── AI Itinerary Schemas ─────────────────────────────────

class ItineraryGenerateRequest(BaseModel):
    duration: str = Field(..., description="e.g. '2 Days'")
    devotee_type: str
    include_stays: bool = True
    include_meals: bool = True
    include_transport: bool = False


class ItineraryItem(BaseModel):
    day: str
    time: str
    activity: str
    type: str  # Aarti, Darshan, Dining, Attraction
    color: str  # Tailwind classes
    description: Optional[str] = None


class ItineraryResponse(BaseModel):
    id: Optional[int] = None
    title: str
    duration: str
    devotee_type: str
    include_stays: bool
    include_meals: bool
    include_transport: bool
    itinerary_data: List[ItineraryItem]
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ─── Real-time / Live Status Schemas ─────────────────────

class QueueStatusResponse(BaseModel):
    gate_number: int
    wait_time_minutes: int
    queue_length: int
    sanctum_occupancy_pct: float
    is_peak_hours: bool
    updated_at: datetime
    status_label: str  # "Low", "Moderate", "High", "Very High"

    model_config = {"from_attributes": True}


class WeatherResponse(BaseModel):
    temperature_c: float
    feels_like_c: float
    description: str
    humidity_pct: int
    wind_speed_kmh: float
    icon: str
    city: str = "Shirdi"
    updated_at: datetime


class AartiInfo(BaseModel):
    name: str
    time: str
    time_24h: str  # "04:30" for comparison
    description: str
    color: str
    dot: str
    minutes_until: Optional[int] = None  # None if already passed today
    is_next: bool = False


class LiveDashboardResponse(BaseModel):
    queues: List[QueueStatusResponse]
    next_aarti: Optional[AartiInfo]
    weather: Optional[WeatherResponse]
    sanctum_is_open: bool
    total_devotees_today: int


# ─── Reminder Schemas ────────────────────────────────────

class ReminderCreateRequest(BaseModel):
    aarti_name: str
    remind_minutes_before: int = Field(30, ge=5, le=120)
    via_whatsapp: bool = True
    via_sms: bool = False


class ReminderResponse(BaseModel):
    id: int
    aarti_name: str
    remind_minutes_before: int
    via_whatsapp: bool
    via_sms: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Generic Responses ───────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int


# ─── Admin Schemas ────────────────────────────────────────
# Every admin update schema lists explicit allowed fields. Request bodies are
# never dumped straight onto a model, so password hashes, tokens, roles and
# other secret columns cannot be written by accident.

class AdminUserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    role: str
    devotee_type: DevoteeType
    is_active: bool
    is_verified: bool
    whatsapp_alerts: bool
    sms_alerts: bool
    booking_count: int = 0
    darshan_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, pattern=r'^\+?[0-9]{10,15}$')
    devotee_type: Optional[DevoteeType] = None
    is_verified: Optional[bool] = None
    whatsapp_alerts: Optional[bool] = None
    sms_alerts: Optional[bool] = None

    model_config = {"extra": "ignore"}

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else _clean_name(v)


class AdminActiveStatusRequest(BaseModel):
    is_active: bool

    model_config = {"extra": "ignore"}


class AdminBookingResponse(BaseModel):
    id: int
    booking_ref: str
    user_id: int
    user_name: str
    user_email: str
    stay_id: str
    stay_name: str
    check_in: datetime
    check_out: datetime
    num_guests: int
    num_rooms: int
    total_price: float
    status: str
    special_requests: Optional[str]
    created_at: datetime
    # Payment details (from payments table)
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None  # "razorpay" | "upi"
    utr: Optional[str] = None
    paid_at: Optional[datetime] = None


class AdminPaymentResponse(BaseModel):
    id: int
    entity_type: str  # "stay" | "dining" | "darshan"
    entity_id: int
    booking_ref: str
    user_id: int
    user_name: str
    user_email: str
    amount: float
    currency: str
    status: str
    payment_method: Optional[str] = None  # "razorpay" | "upi"
    utr: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    special_requests: Optional[str] = None

    model_config = {"from_attributes": True}


class AdminStatusRequest(BaseModel):
    status: str = Field(..., min_length=1, max_length=20)

    model_config = {"extra": "ignore"}


class VerifyUtrRequest(BaseModel):
    utr: str = Field(..., min_length=12, max_length=22)

    model_config = {"extra": "ignore"}


class AdminDarshanResponse(BaseModel):
    id: int
    booking_ref: str
    user_id: int
    user_name: str
    user_email: str
    pass_type: str
    visit_date: datetime
    num_devotees: int
    status: str
    price_paid: float
    gate_number: Optional[int]
    created_at: datetime


class StayCreateRequest(BaseModel):
    id: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-z0-9][a-z0-9\-]*$")
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=200)
    distance: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    price_per_night: float = Field(..., ge=0, le=1_000_000)
    total_rooms: int = Field(10, ge=1, le=10_000)
    rating: float = Field(0.0, ge=0, le=5)
    amenities: Optional[List[str]] = None
    image: Optional[str] = Field(None, max_length=255)
    is_active: bool = True

    model_config = {"extra": "ignore"}

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        return re.sub(r"\s+", " ", (v or "").strip())

    @field_validator("amenities")
    @classmethod
    def clean_amenities(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        return [a.strip() for a in v if a and a.strip()][:20]


class StayUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    location: Optional[str] = Field(None, max_length=200)
    distance: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    price_per_night: Optional[float] = Field(None, ge=0, le=1_000_000)
    total_rooms: Optional[int] = Field(None, ge=1, le=10_000)
    rating: Optional[float] = Field(None, ge=0, le=5)
    amenities: Optional[List[str]] = None
    image: Optional[str] = Field(None, max_length=255)

    model_config = {"extra": "ignore"}

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        return None if v is None else re.sub(r"\s+", " ", v.strip())

    @field_validator("amenities")
    @classmethod
    def clean_amenities(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        return [a.strip() for a in v if a and a.strip()][:20]


class StayResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    location: Optional[str]
    distance: Optional[str]
    category: Optional[str]
    price_per_night: float
    total_rooms: int
    rating: float
    amenities: Optional[List[str]]
    image: Optional[str]
    is_active: bool
    booking_count: int = 0
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PlaceCreateRequest(BaseModel):
    slug: str = Field(..., min_length=2, max_length=80, pattern=r"^[a-z0-9][a-z0-9\-]*$")
    title: str = Field(..., min_length=2, max_length=200)
    category: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    distance: Optional[str] = Field(None, max_length=50)
    duration: Optional[str] = Field(None, max_length=50)
    rating: float = Field(0.0, ge=0, le=5)
    image: Optional[str] = Field(None, max_length=255)
    is_active: bool = True

    model_config = {"extra": "ignore"}


class PlaceUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    distance: Optional[str] = Field(None, max_length=50)
    duration: Optional[str] = Field(None, max_length=50)
    rating: Optional[float] = Field(None, ge=0, le=5)
    image: Optional[str] = Field(None, max_length=255)

    model_config = {"extra": "ignore"}


class PlaceResponse(BaseModel):
    id: int
    slug: str
    title: str
    category: str
    description: Optional[str]
    distance: Optional[str]
    duration: Optional[str]
    rating: float
    image: Optional[str]
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FeedbackCreateRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=5, max_length=2000)

    model_config = {"extra": "ignore"}

    @field_validator("comment")
    @classmethod
    def clean_comment(cls, v: str) -> str:
        cleaned = re.sub(r"\s+", " ", (v or "").strip())
        if len(cleaned) < 5:
            raise ValueError("Comment must be at least 5 characters.")
        return cleaned


class FeedbackResponse(BaseModel):
    id: int
    rating: int
    comment: str
    status: str
    user_id: Optional[int] = None
    user_name: str = "Anonymous"
    user_email: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    message: str = Field(..., min_length=2, max_length=2000)
    audience: str = Field("all", pattern=r"^(all|users|admins)$")
    status: str = Field("published", pattern=r"^(published|draft)$")

    model_config = {"extra": "ignore"}


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    audience: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AnnouncementCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    message: str = Field(..., min_length=2, max_length=2000)
    status: str = Field("published", pattern=r"^(published|draft)$")

    model_config = {"extra": "ignore"}


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    message: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AdminDashboardResponse(BaseModel):
    total_users: int
    new_users_7d: int
    total_bookings: int
    pending_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    completed_bookings: int
    booking_revenue: float
    total_stays: int
    active_stays: int
    total_places: int
    active_places: int
    total_darshan_passes: int
    upcoming_darshan_passes: int
    cancelled_darshan_passes: int
    total_feedback: int
    average_rating: Optional[float]
    total_itineraries: int
    total_reminders: int
    active_reminders: int
    recent_activity: List[dict]

