# 🕌 Explore Shirdi – Sacred Pilgrimage Portal

A full-stack web application for **Shirdi Sai Baba** devotees — built with **Next.js 16** (frontend) and **FastAPI + Python** (backend).

---

## 📁 Project Structure

```
Explore shirdi/
├── frontend/          # Next.js 16 web application
│   ├── app/           # Pages (App Router)
│   ├── components/    # UI components
│   └── public/        # Static images & assets
│
└── Backend/           # FastAPI Python server
    ├── app/           # Routers, models, services
    ├── alembic/       # DB migrations
    ├── run.py         # Entry point
    └── requirements.txt
```

---

## 💻 Prerequisites — Install These First

| Tool | Min Version | Install Command (Windows) |
|------|------------|--------------------------|
| **Git** | 2.40+ | `winget install --id Git.Git` |
| **Node.js** (npm included) | v20.x LTS | `winget install --id OpenJS.NodeJS` |
| **Python** | 3.11+ | `winget install --id Python.Python.3.11` |
| **PowerShell 7** *(optional)* | 7.4+ | `winget install --id Microsoft.PowerShell` |

Verify installations:
```powershell
git --version
node --version
npm --version
python --version
```

---

## 🚀 Full Setup for a New User

### Step 1 — Clone the Repository

```powershell
git clone https://github.com/your-org/explore-shirdi.git
cd "explore-shirdi"
```

---

### Step 2 — Backend Setup (FastAPI + Python)

```powershell
# Navigate to Backend folder
cd Backend

# Create a Python virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# If activation is blocked by policy, run this first:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Install all Python dependencies
pip install -r requirements.txt

# Copy the environment config template
Copy-Item .env.example .env
```

#### Edit `.env` (minimum required changes):
Open `Backend\.env` in any text editor and set:
```env
SECRET_KEY=any-random-string-at-least-32-characters-long
APP_ENV=development
DEBUG=true
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```
> 💡 **No PostgreSQL needed!** The app uses a local SQLite file (`explore_shirdi.db`) automatically when PostgreSQL is unavailable.

#### Start the Backend Server:
```powershell
# Make sure venv is activated (you see "(venv)" in your prompt)
python run.py
```

✅ You should see:
```
[Shirdi] Database tables ready.
[Shirdi] Seeded demo user(s): arjun@example.com
[Shirdi]   login -> arjun@example.com / Demo@1234
[Shirdi] Administrator ready: admin@exploreshirdi.com
INFO: Uvicorn running on http://0.0.0.0:8000
```

🔗 **Backend URLs:**
| URL | Purpose |
|-----|---------|
| `http://localhost:8000` | API status |
| `http://localhost:8000/health` | Health check |
| **`http://localhost:8000/docs`** | 📚 Swagger UI (test all APIs) |
| `http://localhost:8000/redoc` | API reference docs |

---

### Step 3 — Frontend Setup (Next.js)

Open a **new PowerShell window** (keep backend running):

```powershell
# Navigate to Frontend folder
cd "Explore shirdi\frontend"

# Install Node.js dependencies
npm ci

# Create frontend environment file
@"
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/live/ws
NEXT_PUBLIC_BASE_URL=http://localhost:3000
"@ | Out-File -Encoding utf8 .env.local -Force

# Start the development server
npm run dev
```

✅ You should see:
```
▲ Next.js 16.x
- Local: http://localhost:3000
✓ Ready in 2.1s
```

Open **`http://localhost:3000`** in your browser.

---

### Step 4 — Login & Test

Use the auto-seeded demo credentials:

| Role | Email | Password |
|------|-------|----------|
| **Pilgrim** | `arjun@example.com` | `Demo@1234` |
| **Admin** | `admin@exploreshirdi.com` | `Admin@1234` |

---

## 📌 Available Pages (Frontend)

| Route | Page |
|-------|------|
| `/login` | Sign In |
| `/register` | Create Account |
| `/dashboard` | Home (after login) |
| `/attractions` | Discover & Sacred Sites |
| `/darshan` | Darshan & Live Aarti |
| `/stays` | Luxury Stays & Ashrams |
| `/dining` | Prasadam & Dining |
| `/ai-planner` | AI Trip Planner |

---

## 🔌 API Routers (Backend)

| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/auth` | `auth.py` | Register, Login, JWT tokens |
| `/api/darshan` | `darshan.py` | Queue status & pass booking |
| `/api/stays` | `stays.py` | Accommodation listings & booking |
| `/api/dining` | `dining.py` | Prasadam & restaurant options |
| `/api/itinerary` | `itinerary.py` | AI Trip Planner (Gemini/OpenAI) |
| `/api/live` | `live.py` | WebSocket – real-time data |
| `/api/reminders` | `reminders.py` | Aarti alerts (WhatsApp/SMS) |
| `/api/payments` | `payments.py` | Razorpay / UPI |
| `/api/admin` | `admin.py` | Admin management panel |
| `/api/content` | `content.py` | Sacred places & attractions |

---

## ⚠️ Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| `Activate.ps1` not recognized | Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| `ModuleNotFoundError` | Venv not active — check for `(venv)` in prompt, then `pip install -r requirements.txt` |
| Port 8000 already in use | `netstat -ano \| findstr :8000` → `taskkill /PID <PID> /F` |
| Port 3000 in use | `netstat -ano \| findstr :3000` → `taskkill /PID <PID> /F`, or use fallback port `:3001` |
| `@import` CSS parse error | Ensure the very **first line** of `frontend/app/globals.css` is the Google Fonts `@import url(...)` |
| PostgreSQL error on startup | Safe to ignore — app auto-falls back to SQLite (`explore_shirdi.db`) |
| AI Planner not working | Add `GOOGLE_GEMINI_API_KEY` or `OPENAI_API_KEY` to `Backend/.env` |

---

## 🧪 Useful Dev Commands

### Frontend
```powershell
npm run dev          # Hot-reload dev server
npm run build        # Production build
npm start            # Serve production build
npx tsc --noEmit     # TypeScript type-check (must be 0 errors)
```

### Backend
```powershell
# Always activate venv first!
.\venv\Scripts\Activate.ps1

python run.py                         # Start server (auto-reload in debug mode)
uvicorn app.main:app --reload         # Alternative start command
python -m pytest                      # Run tests
```

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes.
4. Frontend: run `npx tsc --noEmit` — must be 0 errors.
5. Backend: run `python -m pytest` — all tests must pass.
6. Submit a Pull Request with a clear description.

---

## 📜 License

This project is licensed under the **MIT License** — free to use, modify, and distribute.

---

## 📞 Contact

- **Maintainer**: Ritesh Lande
- **Issues**: Open a GitHub issue on the repository.

---

*🕉️ Sai Ram — Happy pilgrimage planning!* 🚩
