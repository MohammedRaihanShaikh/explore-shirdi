"""
Quick-start script: python run.py
Alternatively: uvicorn app.main:app --reload
"""
import sys

# Windows consoles default to cp1252, which cannot encode the ✨/📖/⚡ banner
# characters and would crash the server before it starts. Force UTF-8 output.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"✨ Starting Explore Shirdi API on http://{settings.host}:{settings.port}")
    print(f"📖 API Docs: http://localhost:{settings.port}/docs")
    print(f"⚡ WebSocket: ws://localhost:{settings.port}/api/live/ws")
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
        ws="websockets",
    )
