"""
AI Itinerary planner routes.
Uses Google Gemini or OpenAI to generate personalized pilgrimage schedules.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json

from app.database import get_db
from app.models import Itinerary, User
from app.schemas import (
    ItineraryGenerateRequest, ItineraryResponse, ItineraryItem, MessageResponse
)
from app.routers.auth import get_current_user, get_optional_current_user
from app.config import settings

router = APIRouter(prefix="/itinerary", tags=["AI Itinerary Planner"])


# ─── AI Itinerary Generator ────────────────────────────────

async def generate_with_gemini(req: ItineraryGenerateRequest) -> List[dict]:
    """Use Google Gemini to generate itinerary."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.google_gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
You are an expert Shirdi pilgrimage guide. Generate a detailed, practical day-by-day itinerary.

Trip Details:
- Duration: {req.duration}
- Devotee Type: {req.devotee_type}
- Include Stays: {req.include_stays}
- Include Meals: {req.include_meals}
- Include Transport: {req.include_transport}

Shirdi Aarti Times (MUST include):
- Kakad Aarti: 04:30 AM
- Madhyan Aarti: 12:00 PM  
- Dhoop Aarti: 06:15 PM
- Shej Aarti: 10:00 PM

Key Sacred Sites: Samadhi Mandir, Dwarkamai, Chavadi, Lendi Baug, Gurusthan, Shani Shingnapur

Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[
  {{
    "day": "Day 1",
    "time": "04:15 AM",
    "activity": "Activity description here",
    "type": "Aarti",
    "color": "bg-indigo-100 text-indigo-800",
    "description": "Brief helpful description"
  }}
]

Activity types and their colors:
- Aarti: "bg-indigo-100 text-indigo-800"
- Darshan: "bg-orange-100 text-orange-800"
- Dining: "bg-amber-100 text-amber-800"
- Attraction: "bg-rose-100 text-rose-800"
- Stay: "bg-blue-100 text-blue-800"
- Transport: "bg-emerald-100 text-emerald-800"

Generate a complete, realistic schedule. Include 6-10 activities per day.
"""

        response = await model.generate_content_async(prompt)
        text = response.text.strip()
        # Clean markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        return json.loads(text)
    except Exception as e:
        print(f"[Gemini] Error: {e}")
        return None


async def generate_with_openai(req: ItineraryGenerateRequest) -> List[dict]:
    """Use OpenAI GPT to generate itinerary."""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)

        prompt = f"""Generate a Shirdi pilgrimage itinerary for {req.duration}, {req.devotee_type}.
Include stays: {req.include_stays}, meals: {req.include_meals}, transport: {req.include_transport}.
Aarti times: Kakad 04:30, Madhyan 12:00, Dhoop 18:15, Shej 22:00.
Return ONLY a JSON array with fields: day, time, activity, type, color, description.
Types+colors: Aarti=bg-indigo-100 text-indigo-800, Darshan=bg-orange-100 text-orange-800, 
Dining=bg-amber-100 text-amber-800, Attraction=bg-rose-100 text-rose-800."""

        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return data.get("itinerary", data) if isinstance(data, dict) else data
    except Exception as e:
        print(f"[OpenAI] Error: {e}")
        return None


FALLBACK_ITINERARY = [
    {"day": "Day 1", "time": "04:15 AM", "activity": "Arrive at Shirdi, check-in to accommodation", "type": "Stay", "color": "bg-blue-100 text-blue-800", "description": "Early arrival recommended for Kakad Aarti"},
    {"day": "Day 1", "time": "04:30 AM", "activity": "Kakad Aarti at Samadhi Mandir", "type": "Aarti", "color": "bg-indigo-100 text-indigo-800", "description": "Dawn awakening Aarti — most spiritually potent"},
    {"day": "Day 1", "time": "07:00 AM", "activity": "Prasad breakfast at Sansthan Bhojanalaya", "type": "Dining", "color": "bg-amber-100 text-amber-800", "description": "Free satvik breakfast for pilgrims"},
    {"day": "Day 1", "time": "09:00 AM", "activity": "VIP Darshan — Samadhi Mandir (Gate 2)", "type": "Darshan", "color": "bg-orange-100 text-orange-800", "description": "Book VIP pass for zero wait time"},
    {"day": "Day 1", "time": "11:30 AM", "activity": "Dwarkamai Masjid & Dhuni Maa Darshan", "type": "Attraction", "color": "bg-rose-100 text-rose-800", "description": "Sacred mosque where Baba lived for 60 years"},
    {"day": "Day 1", "time": "12:00 PM", "activity": "Madhyan Aarti attendance", "type": "Aarti", "color": "bg-indigo-100 text-indigo-800", "description": "Midday Aarti after Naivedyam ritual"},
    {"day": "Day 1", "time": "02:00 PM", "activity": "Chavadi & Lendi Baug self-guided walk", "type": "Attraction", "color": "bg-rose-100 text-rose-800", "description": "Sacred garden with Baba's tree"},
    {"day": "Day 1", "time": "06:15 PM", "activity": "Dhoop Aarti — Main sanctum hall", "type": "Aarti", "color": "bg-indigo-100 text-indigo-800", "description": "Most attended — spectacular multi-lamp ceremony"},
    {"day": "Day 1", "time": "10:00 PM", "activity": "Shej Aarti — final Aarti of the day", "type": "Aarti", "color": "bg-indigo-100 text-indigo-800", "description": "Baba reverently put to rest with hymns"},
]


@router.post("/generate", response_model=ItineraryResponse)
async def generate_itinerary(
    req: ItineraryGenerateRequest,
    current_user: User | None = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a personalized AI pilgrimage itinerary."""
    itinerary_data = None

    # Try AI providers
    if settings.ai_provider == "gemini" and settings.google_gemini_api_key:
        itinerary_data = await generate_with_gemini(req)
    elif settings.ai_provider == "openai" and settings.openai_api_key:
        itinerary_data = await generate_with_openai(req)

    # Fallback to static sample if AI fails
    if not itinerary_data:
        itinerary_data = FALLBACK_ITINERARY

    title = f"{req.duration} Pilgrimage — {req.devotee_type}"
    itinerary_id = None
    created_at = None

    # Save to DB if user is logged in
    if current_user:
        itinerary = Itinerary(
            user_id=current_user.id,
            title=title,
            duration=req.duration,
            devotee_type=req.devotee_type,
            include_stays=req.include_stays,
            include_meals=req.include_meals,
            include_transport=req.include_transport,
            itinerary_data=itinerary_data,
        )
        db.add(itinerary)
        await db.commit()
        await db.refresh(itinerary)
        itinerary_id = itinerary.id
        created_at = itinerary.created_at

    items = [ItineraryItem(**item) for item in itinerary_data]
    return ItineraryResponse(
        id=itinerary_id,
        title=title,
        duration=req.duration,
        devotee_type=req.devotee_type,
        include_stays=req.include_stays,
        include_meals=req.include_meals,
        include_transport=req.include_transport,
        itinerary_data=items,
        created_at=created_at,
    )


@router.get("/saved", response_model=List[ItineraryResponse])
async def get_saved_itineraries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all saved itineraries for current user."""
    result = await db.execute(
        select(Itinerary)
        .where(Itinerary.user_id == current_user.id)
        .order_by(Itinerary.created_at.desc())
    )
    itineraries = result.scalars().all()
    output = []
    for itin in itineraries:
        items = [ItineraryItem(**item) for item in itin.itinerary_data]
        output.append(ItineraryResponse(
            id=itin.id,
            title=itin.title,
            duration=itin.duration,
            devotee_type=itin.devotee_type,
            include_stays=itin.include_stays,
            include_meals=itin.include_meals,
            include_transport=itin.include_transport,
            itinerary_data=items,
            created_at=itin.created_at,
        ))
    return output


@router.post("/save/{itinerary_id}", response_model=MessageResponse)
async def save_itinerary(
    itinerary_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark an itinerary as saved/favorited."""
    result = await db.execute(
        select(Itinerary).where(
            Itinerary.id == itinerary_id,
            Itinerary.user_id == current_user.id
        )
    )
    itin = result.scalar_one_or_none()
    if not itin:
        raise HTTPException(status_code=404, detail="Itinerary not found.")
    itin.is_saved = True
    db.add(itin)
    await db.commit()
    return MessageResponse(message="Itinerary saved to your trips.")
