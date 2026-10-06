"""
SQLAlchemy ORM Models for Explore Shirdi.
Tables: users, darshan_passes, stay_bookings, itineraries, queue_status,
        aarti_reminders, password_resets, stays, places, feedback,
        notifications, announcements
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float,
    ForeignKey, Text, Enum as SAEnum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.database import Base


# ─── Enums ───────────────────────────────────────────────

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class ContentStatus(str, enum.Enum):
    PUBLISHED = "published"
    DRAFT = "draft"


class FeedbackStatus(str, enum.Enum):
    NEW = "new"
    REVIEWED = "reviewed"
    RESOLVED = "resolved"


class PassType(str, enum.Enum):
    GENERAL = "general"
    VIP = "vip"
    SENIOR_WHEELCHAIR = "senior_wheelchair"
    ABHISHEK_PUJA = "abhishek_puja"


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class DevoteeType(str, enum.Enum):
    GENERAL = "General Devotee"
    SENIOR = "Senior Citizen (60+)"
    FAMILY = "Family with Kids"
    NRI = "Overseas / NRI"
    FIRST_TIME = "First Time Visitor"


# ─── User Model ───────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    # Authorization role. Never set from client input — the backend assigns
    # "user" on registration and only the seeded startup path creates admins.
    role = Column(String(20), nullable=False, default=UserRole.USER.value, index=True)
    devotee_type = Column(SAEnum(DevoteeType), default=DevoteeType.GENERAL)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    whatsapp_alerts = Column(Boolean, default=False)
    sms_alerts = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    darshan_passes = relationship("DarshanPass", back_populates="user")
    stay_bookings = relationship("StayBooking", back_populates="user")
    dining_bookings = relationship("DiningBooking", back_populates="user")
    itineraries = relationship("Itinerary", back_populates="user")
    reminders = relationship("AartiReminder", back_populates="user")
    feedback_items = relationship("Feedback", back_populates="user")


# ─── Darshan Pass Model ───────────────────────────────────

class DarshanPass(Base):
    __tablename__ = "darshan_passes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    pass_type = Column(SAEnum(PassType), nullable=False)
    visit_date = Column(DateTime(timezone=True), nullable=False)
    num_devotees = Column(Integer, default=1)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.PENDING)
    booking_ref = Column(String(20), unique=True, index=True)  # e.g. SHD-2024-001
    price_paid = Column(Float, default=0.0)
    gate_number = Column(Integer, nullable=True)  # 1, 2, 3
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="darshan_passes")


# ─── Stay Booking Model ───────────────────────────────────

class StayBooking(Base):
    __tablename__ = "stay_bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stay_id = Column(String(50), nullable=False)  # e.g. "sai-ashram", "ibis-shirdi"
    stay_name = Column(String(200), nullable=False)
    check_in = Column(DateTime(timezone=True), nullable=False)
    check_out = Column(DateTime(timezone=True), nullable=False)
    num_guests = Column(Integer, default=1)
    num_rooms = Column(Integer, default=1)
    total_price = Column(Float, nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.PENDING)
    booking_ref = Column(String(20), unique=True, index=True)
    special_requests = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="stay_bookings")


# ─── Itinerary Model ─────────────────────────────────────

class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    duration = Column(String(20), nullable=False)  # "2 Days"
    devotee_type = Column(String(50), nullable=False)
    include_stays = Column(Boolean, default=True)
    include_meals = Column(Boolean, default=True)
    include_transport = Column(Boolean, default=False)
    itinerary_data = Column(JSON, nullable=False)  # AI-generated schedule
    is_saved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="itineraries")


# ─── Live Queue Status Model ──────────────────────────────
# (updated by background scheduler, not by users)

class QueueStatus(Base):
    __tablename__ = "queue_status"

    id = Column(Integer, primary_key=True, index=True)
    gate_number = Column(Integer, nullable=False, index=True)  # 1, 2, 3
    wait_time_minutes = Column(Integer, default=0)
    queue_length = Column(Integer, default=0)
    sanctum_occupancy_pct = Column(Float, default=0.0)  # 0-100%
    is_peak_hours = Column(Boolean, default=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ─── Aarti Reminder Model ────────────────────────────────

class AartiReminder(Base):
    __tablename__ = "aarti_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    aarti_name = Column(String(100), nullable=False)  # "Kakad Aarti", etc.
    remind_minutes_before = Column(Integer, default=30)
    via_whatsapp = Column(Boolean, default=True)
    via_sms = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="reminders")


# ─── Password Reset Model ────────────────────────────────
# Stores a short-lived, single-use code for account recovery.

class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    code_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Stay Catalog (admin-managed) ────────────────────────
# Seeded on startup from the trusted STAYS_CATALOG so existing bookings and
# server-side price calculation keep working identically.

class Stay(Base):
    __tablename__ = "stays"

    id = Column(String(50), primary_key=True)  # e.g. "sai-ashram"
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(200), nullable=True)
    distance = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    price_per_night = Column(Float, nullable=False, default=0.0)
    total_rooms = Column(Integer, nullable=False, default=10)
    rating = Column(Float, nullable=False, default=0.0)
    amenities = Column(JSON, nullable=True)  # list[str]
    image = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─── Places / Attractions (admin-managed) ─────────────────

class Place(Base):
    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(80), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    distance = Column(String(50), nullable=True)
    duration = Column(String(50), nullable=True)
    rating = Column(Float, nullable=False, default=0.0)
    image = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─── Feedback ─────────────────────────────────────────────

class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=False)
    status = Column(SAEnum(FeedbackStatus), default=FeedbackStatus.NEW)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="feedback_items")


# ─── Notifications (admin broadcast to pilgrims) ──────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    audience = Column(String(20), nullable=False, default="all")  # all | users | admins
    status = Column(SAEnum(ContentStatus), default=ContentStatus.PUBLISHED)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─── Announcements (public site notices) ─────────────────

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(SAEnum(ContentStatus), default=ContentStatus.DRAFT)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─── Payments (Razorpay) ─────────────────────────────────
# One row per payment attempt against a stay booking or darshan pass.
# The booking stays PENDING until a payment row reaches PAID and its
# Razorpay signature has been verified server-side.

class PaymentStatus(str, enum.Enum):
    CREATED = "created"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(20), nullable=False)  # "stay" | "darshan" | "dining"
    entity_id = Column(Integer, nullable=False)  # stay_bookings.id or darshan_passes.id or dining_bookings.id
    booking_ref = Column(String(30), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    razorpay_order_id = Column(String(60), unique=True, index=True, nullable=False)
    razorpay_payment_id = Column(String(60), nullable=True)
    razorpay_signature = Column(String(255), nullable=True)
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.CREATED)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─── Dining Booking Model ──────────────────────────────────

class DiningBooking(Base):
    __tablename__ = "dining_bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dining_id = Column(String(50), nullable=False)  # e.g. "sansthan-prasadalaya", "prasad-laddu"
    dining_name = Column(String(200), nullable=False)
    num_guests = Column(Integer, default=1)
    total_price = Column(Float, nullable=False)
    status = Column(SAEnum(BookingStatus), default=BookingStatus.PENDING)
    booking_ref = Column(String(20), unique=True, index=True)
    special_requests = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="dining_bookings")
