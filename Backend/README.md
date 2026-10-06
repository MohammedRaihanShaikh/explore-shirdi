# 🏛️ Explore Shirdi — Professional Real-Time Backend API

Production-grade, asynchronous FastAPI backend built for the **Explore Shirdi Devotee Sanctuary Portal**. Features WebSocket live streaming, JWT pilgrim authentication, AI-powered sacred trip planning, pass & stay bookings, and Aarti notification services.

---

## ⚡ Real-Time Features Architecture

| Feature | Protocol | Frequency / Trigger | Endpoint |
|---|---|---|---|
| **Live Gate Queues (Gates 1, 2, 3)** | WebSocket / REST | Streamed every 30s | `ws://localhost:8000/api/live/ws` or `GET /api/live/queue` |
| **Next Aarti Countdown** | WebSocket / REST | Dynamic IST calculations | `GET /api/live/aarti` |
| **Shirdi Live Weather** | WebSocket / REST | OpenWeatherMap / Cached | `GET /api/live/weather` |
| **Sanctum Live Dashboard** | WebSocket / REST | Real-time aggregate | `GET /api/live/dashboard` |
| **Aarti Reminders** | REST + Background alerts | WhatsApp + SMS (Twilio) | `POST /api/reminders/enable` |
| **AI Trip Architect** | REST + Gemini/OpenAI | On-demand intelligent generation | `POST /api/itinerary/generate` |
| **Darshan Pass Booking** | REST + DB sync | Instant reservation with ref codes | `POST /api/darshan/book` |
| **Stay & Ashram Bookings** | REST + DB sync | Date & room availability | `POST /api/stays/book` |

---

## 🚀 Quick Start

### 1. Start the Backend
From the project root:
```bash
# Option A: Double-click start-backend.bat in Windows
# Option B: Run via terminal
cd Backend
python run.py
```

API Server runs at:
- **Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Alternative ReDoc**: `http://localhost:8000/redoc`
- **WebSocket Endpoint**: `ws://localhost:8000/api/live/ws`

### 2. Start Both Backend & Frontend together
In the project root, simply run:
```bash
start-all.bat
```

---

## 📁 Project Structure

```
Backend/
├── app/
│   ├── config.py              # Settings via pydantic-settings (.env)
│   ├── database.py            # Async SQLAlchemy engine (Postgres + SQLite auto-fallback)
│   ├── models.py              # DB Models: User, DarshanPass, StayBooking, Itinerary, etc.
│   ├── schemas.py             # Pydantic schemas for requests/responses
│   ├── main.py                # FastAPI app initialization, middleware, routes
│   ├── routers/
│   │   ├── auth.py            # /api/auth (register, login, me, token refresh)
│   │   ├── darshan.py         # /api/darshan (pass booking, cancellation, passes list)
│   │   ├── stays.py           # /api/stays (catalog, room bookings, my-bookings)
│   │   ├── itinerary.py       # /api/itinerary (AI itinerary generation, saved trips)
│   │   ├── live.py            # /api/live (dashboard, queue, weather, aarti, WebSocket)
│   │   └── reminders.py       # /api/reminders (Aarti alerts via WhatsApp/SMS)
│   └── services/
│       ├── auth_service.py    # JWT issuance/verification, native bcrypt hashing
│       └── realtime_service.py# WebSocket connection manager, queue simulator, weather
├── alembic/                   # Database migrations (optional)
├── run.py                     # Convenience startup script
├── .env                       # Local environment variables
└── requirements.txt           # Python dependencies
```

---

## 🗄️ Database Setup

The backend is built with dual database support:
1. **Zero-Config Development (Default)**: Automatically runs with embedded local SQLite (`explore_shirdi.db`). No installation or configuration required.
2. **Production PostgreSQL**: Provide your PostgreSQL connection string in `.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/explore_shirdi
   ```
   If PostgreSQL is not running or unreachable, the system automatically falls back to SQLite so your app never crashes.

---

## 🤖 AI Itinerary Provider Configuration

In `.env`, configure your preferred LLM:
```env
AI_PROVIDER=gemini
GOOGLE_GEMINI_API_KEY=your_key_here
```
Or use OpenAI:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
```
*Note: If no API key is configured, the system uses the built-in sacred chronological itinerary fallback engine.*

---

## 🔌 Connecting from Frontend

The frontend Next.js app communicates through `@/lib/api.ts` and `@/hooks/useRealtimeData.ts`:
- **HTTP REST**: `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
- **WebSockets**: `NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/live/ws`
