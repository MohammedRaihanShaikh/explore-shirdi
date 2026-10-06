"""
Trusted server-side catalogs.

STAYS_CATALOG is the authoritative source for stay identity and pricing. It is
seeded into the `stays` table at startup so administrators can manage stays
from the admin panel, while the booking endpoint still resolves the price on
the server — a client-supplied `total_price` can never override it.

If the database is unavailable or empty, every reader falls back to these
in-memory dictionaries, so booking never breaks.
"""
from typing import Any

STAYS_CATALOG: dict[str, dict[str, Any]] = {
    "sai-ashram": {
        "name": "Shri Sai Baba Sansthan Ashram",
        "price_per_night": 800,
        "location": "Temple Road, Shirdi",
        "distance": "0.1 km from Samadhi Mandir",
        "category": "Sansthan Trust Accommodation",
        "description": (
            "Official Sansthan Trust accommodation run by the Shri Sai Baba "
            "Sansthan. Simple, clean rooms steps from the Samadhi Mandir with "
            "satvik meals and daily aarti access."
        ),
        "image": "/shirdi-sanctum.jpg",
        "rating": 4.8,
        "total_rooms": 40,
        "amenities": ["Sansthan Certified", "Satvik Meals Included", "Daily Aarti Alert"],
    },
    "ibis-shirdi": {
        "name": "Radisson Blu Shirdi",
        "price_per_night": 4500,
        "location": "Dongargaon Road, Shirdi",
        "distance": "1.2 km from Samadhi Mandir",
        "category": "5-Star Luxury Hotel",
        "description": (
            "Five-star comfort a short drive from the temple, with an outdoor "
            "pool, spa, airport shuttle and dedicated temple transfer service."
        ),
        "image": "/samadhi-mandir.jpg",
        "rating": 4.7,
        "total_rooms": 120,
        "amenities": ["Pool & Spa", "Airport Shuttle", "Temple Transfer"],
    },
    "sai-leela": {
        "name": "Sai Leela Heritage Ashram",
        "price_per_night": 1200,
        "location": "Lendi Baug Road, Shirdi",
        "distance": "0.4 km from Samadhi Mandir",
        "category": "Boutique Ashram",
        "description": (
            "A quiet heritage ashram centred on meditation and yoga, serving "
            "fresh prasad meals to pilgrims staying for extended retreats."
        ),
        "image": "/lendi-baug.jpg",
        "rating": 4.6,
        "total_rooms": 24,
        "amenities": ["Meditation Hall", "Yoga Sessions", "Prasad Meals"],
    },
    "fortune-shirdi": {
        "name": "Fortune Park Sai Residency",
        "price_per_night": 2800,
        "location": "Shirdi-Sai Nagar Road",
        "distance": "0.8 km from Samadhi Mandir",
        "category": "4-Star Business Hotel",
        "description": (
            "A four-star business hotel with air-conditioned rooms, free "
            "breakfast and round-the-clock concierge support for families."
        ),
        "image": "/chavadi.jpg",
        "rating": 4.5,
        "total_rooms": 80,
        "amenities": ["Free Breakfast", "24/7 Concierge", "AC Rooms"],
    },
}

# Dining/prasadam catalog - server-side authoritative pricing
DINING_CATALOG: dict[str, dict[str, Any]] = {
    "sansthan-prasadalaya": {
        "name": "Shri Sai Baba Sansthan Prasadalaya",
        "price_per_guest": 0,
        "category": "Official Sansthan Kitchen",
        "description": "Asia's largest solar-powered community kitchen serving over 50,000 pilgrims daily. Pure satvik meals at zero cost for general devotees. Book a sponsored meal tray for merit.",
        "is_free": True,
    },
    "prasad-laddu": {
        "name": "Sansthan Sacred Laddu Prasad",
        "price_per_guest": 55,
        "category": "Temple Prasad Counter",
        "description": "Book the official Sai Baba laddu prasad in advance. Available in 250g, 500g and 1kg boxes with Sansthan seal. Home delivery pan-India.",
        "is_free": False,
    },
    "maharashtrian-thali": {
        "name": "Gupte's Maharashtrian Bhojanalaya",
        "price_per_guest": 120,
        "category": "Traditional Dining",
        "description": "Authentic Maharashtrian thali with jowar bhakri, zunka, pithla, and fresh sugarcane juice. Located 200m from Dwarkamai. Family-run since 1965.",
        "is_free": False,
    },
    "sai-veg-restaurant": {
        "name": "Sai Arogya Pure Veg Restaurant",
        "price_per_guest": 200,
        "category": "Premium Satvik Dining",
        "description": "Upscale satvik multi-cuisine restaurant with South Indian, Gujarati and North Indian options. Air-conditioned, ideal for family pilgrimages.",
        "is_free": False,
    },
}


# Seed content for the `places` table. These are the sacred sites the portal
# has always showcased — moving them into SQLite lets administrators manage
# them without editing frontend source.
PLACES_CATALOG: list[dict[str, Any]] = [
    {
        "slug": "samadhi-mandir",
        "title": "Shri Samadhi Mandir",
        "category": "Main Sanctum",
        "distance": "0 km (Sanctum)",
        "duration": "1-2 hrs",
        "rating": 4.9,
        "image": "/samadhi-mandir.jpg",
        "description": (
            "The divine resting place of Shri Sai Baba, adorned with Italian "
            "marble, gold spire and daily sacred Aartis. The heartbeat of all "
            "pilgrimages to Shirdi."
        ),
    },
    {
        "slug": "dwarkamai",
        "title": "Dwarkamai Masjid",
        "category": "Eternal Dhuni",
        "distance": "0.2 km",
        "duration": "30-45 mins",
        "rating": 4.8,
        "image": "/dwarkamai.jpg",
        "description": (
            "The rustic mosque where Baba lived for over 60 years. The eternal "
            "Dhuni Maa flame has burned without interruption since Baba's era."
        ),
    },
    {
        "slug": "chavadi",
        "title": "Chavadi Sanctuary",
        "category": "Palkhi Tradition",
        "distance": "0.3 km",
        "duration": "20-30 mins",
        "rating": 4.7,
        "image": "/chavadi.jpg",
        "description": (
            "Where Baba spent alternate nights during the last decade of his "
            "life. Famous for the historic Thursday Palkhi procession with "
            "wooden decor."
        ),
    },
    {
        "slug": "lendi-baug",
        "title": "Lendi Baug & Nanda Deep",
        "category": "Sacred Gardens",
        "distance": "0.4 km",
        "duration": "45-60 mins",
        "rating": 4.6,
        "image": "/lendi-baug.jpg",
        "description": (
            "The serene botanical garden tended by Baba's own hands. Features "
            "the ceaseless Nanda Deep oil lamp encased in glass and marble "
            "platform."
        ),
    },
    {
        "slug": "shani-shingnapur",
        "title": "Shani Shingnapur",
        "category": "Sacred Circuit",
        "distance": "65 km",
        "duration": "Half Day Trip",
        "rating": 4.7,
        "image": "/shirdi-sanctum.jpg",
        "description": (
            "Ancient Shani temple village - famously a village without doors. "
            "An essential pilgrimage extension from Shirdi by AC coach."
        ),
    },
    {
        "slug": "trimbakeshwar",
        "title": "Trimbakeshwar Jyotirlinga",
        "category": "Sacred Circuit",
        "distance": "160 km",
        "duration": "Full Day Trip",
        "rating": 4.8,
        "image": "/shirdi-sanctum.jpg",
        "description": (
            "One of the 12 Jyotirlingas of India, situated near the source of "
            "the Godavari river, surrounded by the Brahmagiri hills."
        ),
    },
]
