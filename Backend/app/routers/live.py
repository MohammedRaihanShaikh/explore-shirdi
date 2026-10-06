"""
Live real-time API routes:
- GET /live/dashboard  — Current queue, aarti, weather snapshot
- GET /live/queue      — Queue status for all gates
- GET /live/weather    — Shirdi weather
- GET /live/aarti      — Aarti schedule + next aarti
- WS  /live/ws        — WebSocket for real-time updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
from datetime import datetime
import pytz

from app.services.realtime_service import (
    manager, simulate_queue_status, fetch_weather,
    get_next_aarti, AARTI_SCHEDULE
)
from app.schemas import (
    LiveDashboardResponse, QueueStatusResponse,
    WeatherResponse, AartiInfo
)

router = APIRouter(prefix="/live", tags=["Live & Real-time"])
IST = pytz.timezone("Asia/Kolkata")


@router.get("/dashboard", response_model=LiveDashboardResponse)
async def get_live_dashboard():
    """Get a full real-time snapshot: queue, aarti, weather."""
    queues_raw = simulate_queue_status()
    queues = [QueueStatusResponse(**q) for q in queues_raw]

    next_aarti_raw = get_next_aarti()
    next_aarti = AartiInfo(**next_aarti_raw) if next_aarti_raw else None

    weather_raw = await fetch_weather()
    weather = None
    if weather_raw:
        weather = WeatherResponse(**weather_raw)

    now_ist = datetime.now(IST)
    from datetime import time
    is_open = time(5, 15) <= now_ist.time() <= time(23, 30)

    import random
    return LiveDashboardResponse(
        queues=queues,
        next_aarti=next_aarti,
        weather=weather,
        sanctum_is_open=is_open,
        total_devotees_today=random.randint(40000, 80000),
    )


@router.get("/queue", response_model=List[QueueStatusResponse])
async def get_queue_status():
    """Get real-time queue status for all 3 gates."""
    return [QueueStatusResponse(**q) for q in simulate_queue_status()]


@router.get("/weather", response_model=Optional[WeatherResponse])
async def get_weather():
    """Get current Shirdi weather."""
    data = await fetch_weather()
    if not data:
        return None
    return WeatherResponse(**data)


@router.get("/aarti", response_model=List[AartiInfo])
async def get_aarti_schedule():
    """Get full Aarti schedule with countdown to next Aarti."""
    next_aarti = get_next_aarti()
    result = []
    for aarti in AARTI_SCHEDULE:
        is_next = next_aarti and aarti["name"] == next_aarti["name"]
        minutes_until = next_aarti["minutes_until"] if is_next else None
        result.append(AartiInfo(
            **aarti,
            minutes_until=minutes_until,
            is_next=bool(is_next),
        ))
    return result


@router.websocket("/ws")
async def websocket_live(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates.
    
    Client receives JSON messages every 30 seconds:
    {
        "type": "LIVE_UPDATE",
        "data": {
            "queues": [...],
            "next_aarti": {...},
            "weather": {...},
            "sanctum_is_open": true,
            "total_devotees_today": 65000,
            "timestamp": "2024-..."
        }
    }
    
    Client can send:
    { "type": "PING" } -> receives { "type": "PONG" }
    """
    await manager.connect(websocket, room="live")
    try:
        # Send immediate snapshot on connect
        queues = simulate_queue_status()
        next_aarti = get_next_aarti()
        weather = await fetch_weather()
        from datetime import time
        import random
        now_ist = datetime.now(IST)
        is_open = time(5, 15) <= now_ist.time() <= time(23, 30)

        await manager.send_personal(websocket, {
            "type": "LIVE_UPDATE",
            "data": {
                "queues": queues,
                "next_aarti": next_aarti,
                "weather": weather,
                "sanctum_is_open": is_open,
                "total_devotees_today": random.randint(40000, 80000),
                "timestamp": now_ist.isoformat(),
            },
        })

        # Listen for client messages
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "PING":
                await manager.send_personal(websocket, {"type": "PONG"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, room="live")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
        manager.disconnect(websocket, room="live")
