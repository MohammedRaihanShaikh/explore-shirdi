"""
Real-time service:
- WebSocket connection manager
- Queue status simulation + broadcasting
- Aarti countdown engine
- Weather fetching (OpenWeatherMap)
"""
import asyncio
import json
import random
import httpx
from datetime import datetime, time, timedelta
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.config import settings
import pytz

IST = pytz.timezone("Asia/Kolkata")

# ─── Aarti Schedule ──────────────────────────────────────────────
AARTI_SCHEDULE = [
    {
        "name": "Kakad Aarti",
        "time": "04:30 AM",
        "time_24h": "04:30",
        "description": "Dawn awakening Aarti — the most spiritually potent.",
        "color": "bg-indigo-100 text-indigo-800",
        "dot": "bg-indigo-500",
    },
    {
        "name": "Madhyan Aarti",
        "time": "12:00 PM",
        "time_24h": "12:00",
        "description": "Midday Aarti performed after the Naivedyam ritual.",
        "color": "bg-amber-100 text-amber-800",
        "dot": "bg-amber-500",
    },
    {
        "name": "Dhoop Aarti",
        "time": "Sunset (~06:15 PM)",
        "time_24h": "18:15",
        "description": "Evening incense Aarti — most attended, spectacular multi-lamp ceremony.",
        "color": "bg-orange-100 text-orange-800",
        "dot": "bg-orange-500",
    },
    {
        "name": "Shej Aarti",
        "time": "10:00 PM",
        "time_24h": "22:00",
        "description": "Night Aarti — Baba reverently put to rest with hymns.",
        "color": "bg-slate-100 text-slate-800",
        "dot": "bg-slate-500",
    },
]


def get_next_aarti() -> Optional[Dict]:
    """Return the next upcoming Aarti and minutes until it."""
    now = datetime.now(IST)
    current_time = now.time()

    for aarti in AARTI_SCHEDULE:
        h, m = map(int, aarti["time_24h"].split(":"))
        aarti_time = time(h, m)
        if aarti_time > current_time:
            aarti_dt = now.replace(hour=h, minute=m, second=0, microsecond=0)
            minutes_until = int((aarti_dt - now).total_seconds() / 60)
            return {**aarti, "minutes_until": minutes_until, "is_next": True}

    # All aartis done today — next is tomorrow's Kakad Aarti
    tomorrow_kakad = now.replace(
        hour=4, minute=30, second=0, microsecond=0
    ) + timedelta(days=1)
    minutes_until = int((tomorrow_kakad - now).total_seconds() / 60)
    return {**AARTI_SCHEDULE[0], "minutes_until": minutes_until, "is_next": True}


# ─── WebSocket Connection Manager ──────────────────────────────
class ConnectionManager:
    """
    Manages active WebSocket connections.
    Supports broadcasting to all clients or specific rooms.
    """

    def __init__(self):
        # All active connections
        self.active_connections: List[WebSocket] = []
        # Room-based connections (e.g., user-specific rooms)
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room: Optional[str] = None):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        if room:
            if room not in self.rooms:
                self.rooms[room] = set()
            self.rooms[room].add(websocket)

    def disconnect(self, websocket: WebSocket, room: Optional[str] = None):
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if room and room in self.rooms:
            self.rooms[room].discard(websocket)

    async def broadcast(self, message: dict):
        """Broadcast a message to ALL connected clients."""
        data = json.dumps(message)
        disconnected = []
        for ws in self.active_connections:
            try:
                await ws.send_text(data)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    async def send_to_room(self, room: str, message: dict):
        """Send a message to all clients in a specific room."""
        if room not in self.rooms:
            return
        data = json.dumps(message)
        disconnected = []
        for ws in self.rooms[room]:
            try:
                await ws.send_text(data)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws, room)

    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send a message to a specific WebSocket connection."""
        await websocket.send_text(json.dumps(message))


# Singleton manager
manager = ConnectionManager()


# ─── Queue Simulation Engine ─────────────────────────────────
# In production, replace with real Sansthan API data

def _get_peak_factor() -> float:
    """Return a multiplier for queue based on time of day."""
    now_hour = datetime.now(IST).hour
    # Peak: 4-5 AM (Kakad Aarti), 11-12 PM, 5-7 PM (Dhoop Aarti)
    if now_hour in [4, 5, 11, 17, 18]:
        return 3.0
    elif now_hour in [6, 10, 12, 16, 19]:
        return 2.0
    elif now_hour in [22, 23, 0, 1, 2, 3]:
        return 0.1  # Closed / very low
    return 1.0


def simulate_queue_status() -> List[Dict]:
    """Simulate real-time queue status for gates 1, 2, 3."""
    peak_factor = _get_peak_factor()
    queues = []
    for gate in [1, 2, 3]:
        base_wait = random.randint(5, 20)
        wait = int(base_wait * peak_factor + random.uniform(-2, 2))
        wait = max(1, wait)
        queue_len = wait * random.randint(8, 15)
        occupancy = min(100, int(peak_factor * 30 + random.uniform(-5, 5)))
        status_label = (
            "Low" if wait < 10
            else "Moderate" if wait < 20
            else "High" if wait < 35
            else "Very High"
        )
        queues.append({
            "gate_number": gate,
            "wait_time_minutes": wait,
            "queue_length": queue_len,
            "sanctum_occupancy_pct": occupancy,
            "is_peak_hours": peak_factor >= 2.0,
            "updated_at": datetime.now(IST).isoformat(),
            "status_label": status_label,
        })
    return queues


# ─── Weather Fetcher ───────────────────────────────────────
_weather_cache: Optional[Dict] = None
_weather_last_updated: Optional[datetime] = None


async def fetch_weather() -> Optional[Dict]:
    """Fetch Shirdi weather from OpenWeatherMap. Cached per interval."""
    global _weather_cache, _weather_last_updated

    # Use cache if fresh
    if _weather_cache and _weather_last_updated:
        age = (datetime.now(IST) - _weather_last_updated).total_seconds()
        if age < settings.weather_update_interval_seconds:
            return _weather_cache

    if not settings.openweather_api_key:
        # Return mock data if no API key
        return {
            "temperature_c": 26.0,
            "feels_like_c": 28.0,
            "description": "Pleasant Breeze",
            "humidity_pct": 55,
            "wind_speed_kmh": 12.0,
            "icon": "01d",
            "city": "Shirdi",
            "updated_at": datetime.now(IST).isoformat(),
        }

    try:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": settings.shirdi_lat,
            "lon": settings.shirdi_lon,
            "appid": settings.openweather_api_key,
            "units": "metric",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        _weather_cache = {
            "temperature_c": round(data["main"]["temp"], 1),
            "feels_like_c": round(data["main"]["feels_like"], 1),
            "description": data["weather"][0]["description"].title(),
            "humidity_pct": data["main"]["humidity"],
            "wind_speed_kmh": round(data["wind"]["speed"] * 3.6, 1),
            "icon": data["weather"][0]["icon"],
            "city": "Shirdi",
            "updated_at": datetime.now(IST).isoformat(),
        }
        _weather_last_updated = datetime.now(IST)
        return _weather_cache
    except Exception as e:
        print(f"[Weather] Error fetching weather: {e}")
        return _weather_cache  # return stale cache if available


# ─── Background Broadcast Loop ──────────────────────────────

async def realtime_broadcast_loop():
    """
    Background task that runs forever:
    - Every 30s: broadcasts queue status + aarti + weather to all WS clients
    """
    print("[Realtime] Broadcast loop started.")
    while True:
        try:
            if manager.active_connections:
                queues = simulate_queue_status()
                next_aarti = get_next_aarti()
                weather = await fetch_weather()

                now_ist = datetime.now(IST)
                is_open = time(5, 15) <= now_ist.time() <= time(23, 30)

                payload = {
                    "type": "LIVE_UPDATE",
                    "data": {
                        "queues": queues,
                        "next_aarti": next_aarti,
                        "weather": weather,
                        "sanctum_is_open": is_open,
                        "total_devotees_today": random.randint(40000, 80000),
                        "timestamp": now_ist.isoformat(),
                    },
                }
                await manager.broadcast(payload)

        except Exception as e:
            print(f"[Realtime] Broadcast error: {e}")

        await asyncio.sleep(settings.queue_update_interval_seconds)
