"""
Application configuration using pydantic-settings.
Loads from .env file automatically.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Explore Shirdi API"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 30

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/explore_shirdi"
    database_sync_url: str = "postgresql://postgres:password@localhost:5432/explore_shirdi"

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_password: str = ""

    # AI
    openai_api_key: str = ""
    google_gemini_api_key: str = ""
    ai_provider: str = "gemini"  # openai | gemini

    # Weather
    openweather_api_key: str = ""
    shirdi_lat: float = 19.7664
    shirdi_lon: float = 74.4762
    weather_update_interval_seconds: int = 600

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    twilio_whatsapp_number: str = "whatsapp:+14155238886"

    # Queue simulation
    queue_update_interval_seconds: int = 30
    sanctum_occupancy_update_seconds: int = 60

    # Email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # File uploads
    upload_dir: str = "uploads"
    max_file_size_mb: int = 5

    # Administrator account seeded on startup (see app/seed.py).
    # Override all three in production — never ship the defaults.
    admin_name: str = "Platform Administrator"
    admin_email: str = "admin@shirdi.org"
    admin_password: str = "Admin@1234"

    # Razorpay (https://razorpay.com). When key_id is empty the payment
    # service runs in MOCK mode: orders are created locally and any
    # verification is accepted, so the whole flow works without real keys.
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # UPI QR payment flow. The merchant UPI id is encoded into a QR code
    # that pilgrims scan with any UPI app (PhonePe, GPay, Paytm). Scanning
    # opens the app with the payment pre-filled; after paying, the pilgrim
    # submits the UTR number which is verified server-side.
    merchant_upi_id: str = ""
    merchant_name: str = "Explore Shirdi"

    @property
    def razorpay_enabled(self) -> bool:
        return bool(self.razorpay_key_id and self.razorpay_key_secret)

    @property
    def upi_enabled(self) -> bool:
        return bool(self.merchant_upi_id)


# Singleton settings instance
settings = Settings()
