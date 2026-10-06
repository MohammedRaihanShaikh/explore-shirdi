"""
Explore Shirdi — FastAPI Backend Entry Point

Features:
- JWT Authentication
- PostgreSQL with SQLAlchemy async
- WebSockets for real-time queue/aarti/weather
- AI-powered pilgrimage itinerary (Gemini / OpenAI)
- Darshan pass & stay bookings
- Aarti reminders (WhatsApp/SMS via Twilio)
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.config import settings
from app.database import create_tables, engine
from app.migrations import run_light_migrations
from app.services.realtime_service import realtime_broadcast_loop
from app.seed import (
    seed_demo_users,
    seed_admin_user,
    seed_stays,
    seed_places,
    DEMO_USERS,
)
from app.routers import auth, darshan, stays, dining, itinerary, live, reminders, admin, content, payments


# ─── Startup / Shutdown ─────────────────────────────────────

_broadcast_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    global _broadcast_task

    # — Startup —
    print(f"[Shirdi] Starting {settings.app_name} ({settings.app_env})...")

    # Create DB tables if they don't exist
    try:
        await create_tables()
        print("[Shirdi] Database tables ready.")
    except Exception as db_err:
        print(f"[Shirdi] WARNING: DB not available - {db_err.__class__.__name__}: {db_err}")
        print("[Shirdi] Attempting to continue with SQLite fallback...")

    # Add any columns introduced since the database file was created
    # (create_all never alters existing tables). Safe to run every startup.
    try:
        applied = await run_light_migrations(engine)
        if applied:
            print(f"[Shirdi] Schema migrated: {', '.join(applied)}")
    except Exception as mig_err:
        print(f"[Shirdi] WARNING: migration failed - {mig_err.__class__.__name__}: {mig_err}")

    # Seed known demo logins (idempotent) so there is always a working account
    try:
        created = await seed_demo_users()
        if created:
            print(f"[Shirdi] Seeded demo user(s): {', '.join(created)}")
        for u in DEMO_USERS:
            print(f"[Shirdi]   login -> {u['email']} / {u['password']} ({u['full_name']})")
    except Exception as seed_err:
        print(f"[Shirdi] WARNING: demo user seed failed - {seed_err.__class__.__name__}: {seed_err}")

    # Administrator account — created server-side only (never from a request body)
    try:
        admin_email = await seed_admin_user()
        if admin_email:
            print(f"[Shirdi] Administrator ready: {admin_email}")
        if settings.admin_password == "Admin@1234":
            print(
                "[Shirdi] WARNING: using the default ADMIN_PASSWORD. "
                "Set ADMIN_NAME/ADMIN_EMAIL/ADMIN_PASSWORD before deploying."
            )
    except Exception as admin_err:
        print(f"[Shirdi] WARNING: admin seed failed - {admin_err.__class__.__name__}: {admin_err}")

    # Admin-managed catalogs (stays + sacred places), seeded once
    try:
        stays_added = await seed_stays()
        places_added = await seed_places()
        if stays_added or places_added:
            print(f"[Shirdi] Seeded catalog: {stays_added} stay(s), {places_added} place(s)")
    except Exception as cat_err:
        print(f"[Shirdi] WARNING: catalog seed failed - {cat_err.__class__.__name__}: {cat_err}")

    # Start real-time broadcast background task
    _broadcast_task = asyncio.create_task(realtime_broadcast_loop())
    print("[Shirdi] Real-time broadcast loop started.")

    yield  # App is running

    # — Shutdown —
    if _broadcast_task:
        _broadcast_task.cancel()
        try:
            await _broadcast_task
        except asyncio.CancelledError:
            pass
    print("[Shirdi] Server shutdown complete.")


# ─── FastAPI App ───────────────────────────────────────────

app = FastAPI(
    title="Explore Shirdi API",
    description="""
## Official Explore Shirdi Backend API

Professional REST + WebSocket API for the Shirdi Sai Baba Devotee Portal.

### Features
- 🔐 **JWT Authentication** — Register, login, refresh tokens
- 🚌 **Darshan Pass Booking** — General, VIP, Senior, Abhishek Puja
- 🏨 **Stay Bookings** — Ashrams, hotels, spiritual retreats
- 🤖 **AI Itinerary Planner** — Gemini/OpenAI powered pilgrimage schedules
- ⚡ **Real-time WebSocket** — Live queue, Aarti countdown, Shirdi weather
- 📣 **Aarti Reminders** — WhatsApp + SMS alerts via Twilio
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ─── Middleware ───────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ─── Global Error Handling ─────────────────────────────────────

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Return every unexpected error as JSON (never an HTML stack trace),
    so the frontend can always show a meaningful message.
    """
    print(f"[Shirdi] Unhandled error on {request.method} {request.url.path}: "
          f"{exc.__class__.__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


# ─── Routers ───────────────────────────────────────────────

API_PREFIX = "/api"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(darshan.router, prefix=API_PREFIX)
app.include_router(stays.router, prefix=API_PREFIX)
app.include_router(dining.router, prefix=API_PREFIX)
app.include_router(itinerary.router, prefix=API_PREFIX)
app.include_router(live.router, prefix=API_PREFIX)
app.include_router(reminders.router, prefix=API_PREFIX)
app.include_router(content.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)


# ─── Health & Root ────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint — API status."""
    return {
        "service": "Explore Shirdi API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "websocket": "/api/live/ws",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": settings.app_name}


# ─── Entry Point ───────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
