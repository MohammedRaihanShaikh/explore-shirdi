/**
 * English source-of-truth dictionary.
 *
 * `en` defines the shape of the whole translation surface. `hi` and `mr` are
 * typed as `Record<TranslationKey, string>`, so a key added here without a
 * translation becomes a TypeScript build error rather than an English string
 * silently leaking into a Hindi page.
 *
 * Flat dotted keys keep lookups cheap and make missing entries obvious.
 */
export const en = {
  // ─── Brand ───────────────────────────────────────────────
  "brand.name": "Explore Shirdi",
  "brand.portal": "Sacred Sanctuary Portal",
  "brand.adminPanel": "Admin Panel",

  // ─── Navigation ───────────────────────────────────────────
  "nav.home": "Home",
  "nav.attractions": "Discover & Attractions",
  "nav.darshan": "Darshan & Live Aarti",
  "nav.stays": "Luxury Stays & Ashrams",
  "nav.dining": "Prasadam & Dining",
  "nav.planner": "AI Trip Planner",
  "nav.pilgrimPortal": "Pilgrim Portal",
  "nav.toggleMenu": "Toggle navigation menu",
  "nav.preferences": "Preferences",

  // ─── Preferences panel ────────────────────────────────────
  "prefs.title": "Preferences",
  "prefs.subtitle": "Region and language",
  "prefs.region": "Region",
  "prefs.regionHint": "Controls number and date formats",
  "prefs.language": "Language",
  "prefs.languageHint": "Translates the portal",
  "prefs.currency": "Currency",
  "prefs.currencyNote": "All bookings are charged in Indian Rupees (INR).",
  "prefs.save": "Save preferences",
  "prefs.saved": "Preferences saved.",
  "prefs.close": "Close preferences",

  // ─── Account ──────────────────────────────────────────────
  "account.guest": "Guest",
  "account.pilgrim": "Pilgrim",
  "account.administrator": "Administrator",
  "account.notSignedIn": "Not signed in",
  "account.verified": "Verified",
  "account.unverified": "Unverified",
  "account.email": "Email",
  "account.phone": "Phone",
  "account.devoteeType": "Devotee type",
  "account.memberSince": "Member since",
  "account.signIn": "Sign In",
  "account.signOut": "Sign Out",
  "account.accountDetails": "Account details",
  "account.editDetails": "Edit my details",
  "account.myProfile": "My Pilgrim Portal",
  "account.myAdminProfile": "My Admin Profile",

  // ─── Edit profile ─────────────────────────────────────────
  "edit.title": "Edit your details",
  "edit.subtitle": "Keep your contact details current for Darshan alerts.",
  "edit.fullName": "Full name",
  "edit.email": "Email address",
  "edit.emailHint":
    "This is also your sign-in ID. Changing it resets your verified badge until the new address is confirmed.",
  "edit.phone": "Phone number",
  "edit.phoneHint": "10–15 digits, optionally starting with +. Leave blank to remove.",
  "edit.devoteeType": "Devotee type",
  "edit.alerts": "Aarti reminders",
  "edit.whatsapp": "WhatsApp alerts",
  "edit.sms": "SMS alerts",
  "edit.managedByTrust": "Managed by the trust",
  "edit.role": "Role",
  "edit.verified": "Verified",
  "edit.cancel": "Cancel",
  "edit.done": "Done",
  "edit.save": "Save changes",
  "edit.saving": "Saving…",

  // ─── Common actions / states ──────────────────────────────
  "common.loading": "Loading…",
  "common.refresh": "Refresh",
  "common.retry": "Retry",
  "common.search": "Search",
  "common.filters": "Filters",
  "common.clearFilters": "Clear all filters",
  "common.close": "Close",
  "common.view": "View",
  "common.back": "Back",
  "common.optional": "Optional",
  "common.signInRequired": "You must be logged in to continue.",
  "common.backendDown": "Cannot reach the server. Please make sure the backend is running.",

  // ─── Devotee types ────────────────────────────────────────
  "devotee.general": "General Devotee",
  "devotee.senior": "Senior Citizen (60+)",
  "devotee.family": "Family with Kids",
  "devotee.nri": "Overseas / NRI",
  "devotee.firstTime": "First Time Visitor",

  // ─── Footer ───────────────────────────────────────────────
  "footer.about":
    "The definitive luxury pilgrimage accompaniment for Shirdi Sai Baba devotees, offering sacred slot scheduling, boutique retreat discovery, and personalized sanctum travel.",
  "footer.helpline": "Helpline",
  "footer.timings": "Sanctum Timings",
  "footer.essentials": "Sansthan & Essentials",
  "footer.explore": "Explore the Portal",
  "footer.aarti.kakad": "Kakad Aarti",
  "footer.aarti.madhyan": "Madhyan Aarti",
  "footer.aarti.dhoop": "Dhoop Aarti",
  "footer.aarti.shej": "Shej Aarti",
  "footer.darshan.general": "General Darshan",
  "footer.trust.name": "Sai Baba Sansthan Trust",
  "footer.trust.official": "Official portal",
  "footer.trust.helpline": "Trust Helpline",
  "footer.hospital": "Shri Sainath Hospital",
  "footer.hospitalValue": "24/7 emergency",
  "footer.police": "Pilgrim Police Unit",
  "footer.policeValue": "24/7 assistance",
  "footer.airport": "Shirdi Airport (SAG)",
  "footer.airportValue": "Directions",
  "footer.accessibility": "Wheelchair & Senior Care",
  "footer.accessibilityValue": "Priority Darshan",
  "footer.rights":
    "Dedicated with devotion to Shri Shirdi Sai Baba.",
  "footer.disclaimer": "Timings are indicative. Confirm with the Sansthan before travelling.",

  // ─── Dashboard ────────────────────────────────────────────
  "dashboard.services": "Holistic Pilgrim Services",
  "dashboard.servicesEyebrow": "Sacred Conveniences",
  "dashboard.sites": "Sacred Sites of Grace & Miracle",
  "dashboard.sitesEyebrow": "Sanctum Chronology",

  // ─── Attractions ──────────────────────────────────────────
  "attractions.eyebrow": "Sanctum Chronology",
  "attractions.title": "Discover & Attractions",
  "attractions.subtitle":
    "Step into the authentic sacred places where Sai Baba walked, meditated, and poured boundless compassion upon visiting pilgrims.",
  "attractions.searchPlaceholder": "Search sacred sites, temples, gardens…",
  "attractions.loading": "Loading sacred sites…",
  "attractions.noResults": "No sites match your search",
  "attractions.noResultsHint": "Try a different keyword or clear the category filter.",
  "attractions.showing": "Showing {shown} of {total} sacred sites",
  "attractions.builtIn": "built-in catalogue",
  "attractions.bestTime": "Best time to visit",
  "attractions.highlights": "Highlights",
  "attractions.tip": "Pilgrim tip",
  "attractions.bookDarshan": "Book Darshan Pass",
  "attractions.planVisit": "Plan My Visit",
  "attractions.allCategories": "All",
  "attractions.desc.samadhi-mandir":
    "The divine resting place of Shri Sai Baba, adorned with Italian marble, gold spire and daily sacred Aartis. The heartbeat of all pilgrimages to Shirdi.",
  "attractions.desc.dwarkamai":
    "The rustic mosque where Baba lived for over 60 years. The eternal Dhuni Maa flame has burned without interruption since Baba's era.",
  "attractions.desc.chavadi":
    "Where Baba spent alternate nights during the last decade of his life. Famous for the historic Thursday Palkhi procession with wooden decor.",
  "attractions.desc.lendi-baug":
    "The serene botanical garden tended by Baba's own hands. Features the ceaseless Nanda Deep oil lamp encased in glass and marble platform.",
  "attractions.desc.shani-shingnapur":
    "Ancient Shani temple village — famously a village without doors. An essential pilgrimage extension from Shirdi by AC coach.",
  "attractions.desc.trimbakeshwar":
    "One of the 12 Jyotirlingas of India, situated near the source of the Godavari river, surrounded by the Brahmagiri hills.",
  "attractions.desc.default":
    "A sacred site in the Shirdi pilgrimage circuit, open as per the timings of the managing trust.",
  "attractions.best.samadhi-mandir": "Kakad Aarti at 4:30 AM, or Dhoop Aarti at sunset.",
  "attractions.best.dwarkamai": "Early morning, as the Darshan opens at 5:15 AM.",
  "attractions.best.chavadi": "Thursday evening, when the Palkhi procession arrives around 7 PM.",
  "attractions.best.lendi-baug": "Morning, when the garden is cool and the Nanda Deep is attended.",
  "attractions.best.shani-shingnapur": "Depart early — the drive from Shirdi takes about 2.5 hours.",
  "attractions.best.trimbakeshwar": "Start before sunrise for a full-day pilgrimage circuit.",
  "attractions.best.default": "Plan your visit around the local Aarti and temple timings.",
  "attractions.hl.samadhi-mandir.1": "Italian marble temple with a gold-plated spire",
  "attractions.hl.samadhi-mandir.2": "The main sanctum and heart of every Shirdi pilgrimage",
  "attractions.hl.samadhi-mandir.3": "Four Aartis daily — Kakad, Madhyan, Dhoop and Shej",
  "attractions.hl.samadhi-mandir.4": "Devotees offer flowers and padak before the shrine",
  "attractions.hl.dwarkamai.1": "Baba's own residence for over 60 years",
  "attractions.hl.dwarkamai.2": "The eternal Dhuni Maa flame, burning without interruption",
  "attractions.hl.dwarkamai.3": "Tomb of Baba's parents, Deccanpurnabai and Venkateshwara",
  "attractions.hl.dwarkamai.4": "Baba's sword and the tambura of the Five Saints are kept here",
  "attractions.hl.chavadi.1": "Baba spent alternate nights here in his final decade",
  "attractions.hl.chavadi.2": "Home of the famous Thursday Palkhi procession",
  "attractions.hl.chavadi.3": "Traditional wooden architecture with carved pillars",
  "attractions.hl.chavadi.4": "Palkhi chariots carry devotees in a continuous circuit",
  "attractions.hl.lendi-baug.1": "Serene garden tended by Baba's own hands",
  "attractions.hl.lendi-baug.2": "The ceaseless Nanda Deep oil lamp behind glass and marble",
  "attractions.hl.lendi-baug.3": "Baba's planted trees, including the famous Gulab rose",
  "attractions.hl.lendi-baug.4": "Stone footprints of Dattatreya in the shrine",
  "attractions.hl.shani-shingnapur.1": "Ancient Shani temple and Jyotirling shrine",
  "attractions.hl.shani-shingnapur.2": "The famous doorless village — many homes have no doors at all",
  "attractions.hl.shani-shingnapur.3": "Shani Shingnapur Mahotsav is held here",
  "attractions.hl.shani-shingnapur.4": "Regular AC-coach pilgrim circuits run from Shirdi",
  "attractions.hl.trimbakeshwar.1": "One of the 12 Jyotirlingas of India",
  "attractions.hl.trimbakeshwar.2": "Kunda, the source of the Godavari river",
  "attractions.hl.trimbakeshwar.3": "Set among the Brahmagiri hills",
  "attractions.hl.trimbakeshwar.4": "Kalaram temple and Kushavarta Kund nearby",
  "attractions.hl.default.1": "A sacred site in the Shirdi pilgrimage circuit",
  "attractions.hl.default.2": "Open as per the timings of the managing trust",
  "attractions.tip.samadhi-mandir": "Shoes must be removed before the sanctum. Photography is not permitted inside.",
  "attractions.tip.dwarkamai": "Remove your shoes before stepping onto the marble platform where the Dhuni burns.",
  "attractions.tip.chavadi": "Weekday mornings are quiet. For the Palkhi, watch from the roadside.",
  "attractions.tip.lendi-baug": "A quiet spot for silent darshan — pair it with the Chavadi walk next door.",
  "attractions.tip.shani-shingnapur": "Plan this as a half-day trip and confirm the return journey with your operator.",
  "attractions.tip.trimbakeshwar": "About 160 km from Shirdi. Combine with Shani Shingnapur only on a generous schedule.",
  "attractions.tip.default": "Confirm timings locally before travelling to this site.",
  "attractions.emptyPublished": "No sacred sites are published yet — showing the built-in catalogue.",

  // ─── Stays ────────────────────────────────────────────────
  "stays.eyebrow": "Sansthan Curated",
  "stays.title": "Luxury Stays & Ashrams",
  "stays.subtitle":
    "Handpicked 5-star spiritual wellness resorts, serene Trust ashrams and quiet heritage villas within walking distance of the Samadhi Mandir.",
  "stays.destination": "Destination",
  "stays.checkIn": "Check-in",
  "stays.checkOut": "Check-out",
  "stays.guests": "Guests",
  "stays.rooms": "Rooms",
  "stays.featured": "Top-rated stays in Shirdi",
  "stays.count": "{count} stays in Shirdi",
  "stays.countOne": "1 stay in Shirdi",
  "stays.sortBy": "Sort by",
  "stays.sort.best": "Best Value",
  "stays.sort.rating": "Top Rated",
  "stays.sort.priceAsc": "Price: Low to High",
  "stays.sort.priceDesc": "Price: High to Low",
  "stays.sort.distance": "Closest to Temple",
  "stays.filter.price": "Price per night",
  "stays.filter.rating": "Pilgrim rating",
  "stays.filter.anyRating": "Any rating",
  "stays.filter.category": "Property type",
  "stays.filter.amenities": "Amenities",
  "stays.filter.upTo": "Up to {amount}",
  "stays.noResults": "No stays match your filters",
  "stays.noResultsHint": "Widen the price range or clear a filter to see more properties.",
  "stays.loading": "Loading stays…",
  "stays.perNight": "Per night",
  "stays.from": "from",
  "stays.checkAvailability": "Check availability",
  "stays.roomsLabel": "{count} rooms",
  "stays.chooseDates": "Choose your dates above, then check availability on any stay.",
  "stays.myBookings": "My Stay Bookings",
  "stays.noBookings": "No bookings yet",
  "stays.noBookingsHint":
    "Book a stay above and it will appear here — even after you refresh or log back in.",
  "stays.signInToSee": "Sign in to see your bookings",
  "stays.signInToSeeHint": "Your stay reservations are linked to your pilgrim account.",
  "stays.loadingBookings": "Loading your bookings...",
  "stays.cancel": "Cancel",
  "stays.bookingConfirmed": "Booking Confirmed!",
  "stays.bookingConfirmedHint": "Your stay has been successfully reserved.",
  "stays.bookingRef": "Booking Reference",
  "stays.totalPaid": "Total Paid: {amount}",
  "stays.viewBookings": "View My Bookings",
  "stays.done": "Done",
  "stays.specialRequests": "Special Requests (Optional)",
  "stays.specialRequestsPlaceholder":
    "E.g. Ground floor room, early check-in, prasad meals...",
  "stays.totalAmount": "Total Amount",
  "stays.confirmBooking": "Confirm Stay Booking",
  "stays.confirming": "Confirming Booking...",
  "stays.loginToBook": "You must be logged in to book a stay. Please sign in first.",
  "stays.secureNote": "You must be logged in to book. Your details are stored securely.",

  // ─── Darshan ──────────────────────────────────────────────
  "darshan.eyebrow": "Sanctum Schedule",
  "darshan.title": "Darshan & Live Aarti",
  "darshan.subtitle":
    "Book instant VIP darshan passes, stream live sacred Aartis, and get real-time gate queue alerts for Shri Shirdi Sai Baba Mandir.",
  "darshan.schedule": "Daily Aarti Schedule",
  "darshan.passBooking": "Darshan Pass Booking",
  "darshan.myPasses": "My Darshan Passes",

  // ─── Dining ───────────────────────────────────────────────
  "dining.eyebrow": "Sacred Nourishment",
  "dining.title": "Prasadam & Dining",
  "dining.subtitle":
    "From the sacred Sansthan community kitchen to traditional Maharashtrian thalis — savour pure satvik nourishment on your Shirdi pilgrimage.",

  // ─── AI Planner ───────────────────────────────────────────
  "planner.eyebrow": "Sanctum Intelligence",
  "planner.title": "AI Trip Planner",
  "planner.subtitle":
    "Build a personalised Shirdi itinerary around your dates, budget and preferred pace of pilgrimage.",

  // ─── Auth ─────────────────────────────────────────────────
  "auth.welcome": "Welcome back",
  "auth.loginSubtitle": "Sign in to continue your pilgrimage.",
  "auth.registerTitle": "Create your account",
  "auth.registerSubtitle": "Begin your journey with Shri Sai Baba.",
  "auth.forgotTitle": "Reset your password",
  "auth.forgotSubtitle": "We will email you a secure reset link.",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.phone": "Phone",
  "auth.fullName": "Full name",
  "auth.confirmPassword": "Confirm password",
  "auth.devoteeType": "Devotee type",
  "auth.login": "Sign In",
  "auth.register": "Create Account",
  "auth.forgotPassword": "Forgot password?",
  "auth.noAccount": "New to the portal?",
  "auth.haveAccount": "Already have an account?",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",

  // ─── Admin shell ──────────────────────────────────────────
  "admin.management": "Management",
  "admin.communication": "Communication",
  "admin.system": "System",
  "admin.logout": "Logout",
  "admin.title": "Admin Panel",

  // ─── Dashboard hero ───────────────────────────────────────
  "hero.badge": "Official Devotee Assistance Network",
  "hero.titleLead": "Embrace the Divine Presence of",
  "hero.titleHighlight": "Shri Sai Baba",
  "hero.subtitle":
    "Your official gateway to peaceful darshan passes, sacred heritage walks, satvik dining, and bespoke spiritual retreats in Shirdi.",
  "hero.queue": "Sanctum Queue",
  "hero.nextAarti": "Next Sacred Aarti",
  "hero.climate": "Shirdi Climate",
  "hero.loadingLive": "Loading live status...",
  "hero.queueUnavailable": "Live queue unavailable",
  "hero.aartiUnavailable": "Aarti schedule unavailable",
  "hero.weatherUnavailable": "Weather unavailable",
  "hero.gateStatus": "Gate {gate} · {minutes} mins ({status})",

  // ─── Dashboard services ───────────────────────────────────
  "services.eyebrow": "Sacred Conveniences",
  "services.title": "Holistic Pilgrim Services",
  "services.subtitle":
    "Designed with devotion and luxury simplicity to make your Shirdi visit unhurried, peaceful, and spiritually enriching.",
  "services.exploreAll": "Explore All 14 Trust Facilities",
  "services.vip.title": "Instant VIP Darshan",
  "services.vip.tag": "Sansthan Official Token",
  "services.vip.description":
    "Direct authenticated biometric queue passes. Zero wait time for senior citizens, infants, and special puja offerings with live slot status updates.",
  "services.vip.footer": "From ₹200 Subsidized",
  "services.stays.title": "Sanctuary Stays & Ashrams",
  "services.stays.tag": "Verified Sansthan & Boutique",
  "services.stays.description":
    "Handpicked 5-star spiritual wellness resorts, serene Trust ashrams, and quiet heritage villas within 500 meters of temple Gate No. 2.",
  "services.stays.footer": "120+ Curated Stays",
  "services.ai.title": "SaiAI Trip Architect",
  "services.ai.tag": "Intelligent Devotee Assistant",
  "services.ai.description":
    "Generate customized 1, 2, or 3-day spiritual pilgrimage routes optimized for resting hours, elderly mobility, and children's meal breaks.",
  "services.ai.footer": "Smart In-App Itinerary",
  "services.prasadam.title": "Prasadam & Bhojanalaya",
  "services.prasadam.tag": "Asia's Largest Solar Kitchen",
  "services.prasadam.description":
    "Reserve priority pure satvik meals at the sacred Prasadalaya, or discover traditional Maharashtrian thalis, bhakri, and fresh sugarcane nectar nearby.",
  "services.prasadam.footer": "Sansthan Laddu Box Booking",
  "services.live.title": "360° Live Aarti Broadcast",
  "services.live.tag": "24/7 Sanctum Feed",
  "services.live.description":
    "Experience ultra-low latency holy darshan of Shri Sai Baba's Samadhi from home, with multi-angle views and high-fidelity devotional chanting audio.",
  "services.live.footer": "Free Sacred Stream",
  "services.excursions.title": "Nearby Sacred Excursions",
  "services.excursions.tag": "Spiritual Circuit",
  "services.excursions.description":
    "Effortlessly book chauffeur-driven sanitized day trips to Shani Shingnapur, Trimbakeshwar Jyotirlinga, Muktidham Nashik, and Ellora Caves.",
  "services.excursions.footer": "Chauffeur & AC Coaches",

  // ─── Dashboard sacred sites ───────────────────────────────
  "sites.eyebrow": "Sanctum Chronology",
  "sites.title": "Sacred Sites of Grace & Miracle",
  "sites.subtitle":
    "Step into the authentic places where Sai Baba walked, meditated, and poured boundless compassion upon visiting pilgrims.",
  "sites.dwarkamai.title": "Dwarkamai Masjid",
  "sites.dwarkamai.badge": "Eternal Dhuni",
  "sites.dwarkamai.description":
    "The rustic mosque where Baba resided for over 60 years. Here the eternal sacred flame (Dhuni Maa) burns uninterrupted since Baba's era.",
  "sites.samadhi.title": "Shri Samadhi Mandir",
  "sites.samadhi.badge": "Main Sanctum",
  "sites.samadhi.description":
    "The resting place of Sai Baba's mortal body, constructed with Italian marble and gold spire. The epicentre of global devotion and daily Aartis.",
  "sites.chavadi.title": "Chavadi Sanctuary",
  "sites.chavadi.badge": "Palkhi Tradition",
  "sites.chavadi.description":
    "Where Baba spent alternate nights during the final decade of his life. Venue of the famous Thursday Palkhi procession with wooden heritage decor.",
  "sites.lendi.title": "Lendi Baug & Nanda Deep",
  "sites.lendi.badge": "Sacred Gardens",
  "sites.lendi.description":
    "The serene botanical garden nurtured by Baba's own hands. Features the ceaseless Nanda Deep oil lamp encased in glass and marble.",

  // ─── Dashboard safeguards ──────────────────────────────────
  "safeguards.eyebrow": "Sanctum Assurance",
  "safeguards.title": "Official Trust & Pilgrim Safeguards",
  "safeguards.certified.title": "Sansthan Certified",
  "safeguards.certified.description":
    "Direct real-time API connection to Shri Saibaba Sansthan Trust ticketing servers.",
  "safeguards.commission.title": "Zero Commission Rates",
  "safeguards.commission.description":
    "100% subsidized darshan & prasadalaya pricing strictly mandated by Trust guidelines.",
  "safeguards.wheelchair.title": "Free Wheelchair Seva",
  "safeguards.wheelchair.description":
    "Stationed attendants ready 24/7 at Gate 2 with dedicated ramp access to the Sanctum.",
  "safeguards.concierge.title": "24/7 Pilgrim Concierge",
  "safeguards.concierge.description":
    "Multilingual support in Marathi, Hindi, Telugu, Tamil, and English on WhatsApp & Call.",

  // ─── Darshan page ─────────────────────────────────────────
  "darshan.liveNow": "Live Now",
  "darshan.streamTitle": "360° Sanctum Aarti Broadcast",
  "darshan.streamHint": "HD multi-angle stream with devotional audio",
  "darshan.watchLive": "Watch Live",
  "darshan.remindersTitle": "Aarti Reminders",
  "darshan.remindersHint": "WhatsApp alerts 30 minutes before each Aarti",
  "darshan.enable": "Enable",
  "darshan.free": "Free",
  "darshan.passRefs": "Pass references",
  "darshan.signInPasses": "Sign in to reserve or view your Darshan passes.",
  "darshan.noPasses": "No passes booked yet",
  "darshan.noPassesHint": "Book a pass above and it will appear here automatically.",
  "darshan.bookingConfirmed": "Booking Confirmed!",
  "darshan.visitDate": "Visit date",
  "darshan.numDevotees": "Number of Devotees",
  "darshan.gate": "Gate",
  "darshan.total": "Total Amount",
  "darshan.confirmBooking": "Confirm Darshan Booking",
  "darshan.cancelPass": "Cancel",
  "darshan.days": "Days",
  "darshan.secureNote": "You must be logged in to book a Darshan pass.",

  // ─── Dining page ──────────────────────────────────────────
  "dining.bookingConfirmed": "Booking Confirmed!",
  "dining.bookingConfirmedHint": "Your dining reservation has been confirmed.",
  "dining.freeNote": "No payment required - Free prasadam",
  "dining.freeNoteHint": "No payment required. Your booking will be confirmed instantly.",
  "dining.saveRef": "Save your booking reference. It is now stored in your account.",
  "dining.isFree": "This prasadam is FREE of charge",
  "dining.totalAmount": "Total Amount",
  "dining.secureNote": "You must be logged in to book. Your details are stored securely.",
  "dining.confirming": "Confirming Booking...",
  "dining.myBookings": "My Dining Bookings",
  "dining.bookSlot": "Book Slot",
  "dining.guests": "Number of Guests",
  "dining.confirmFree": "Confirm Free Booking",
  "dining.confirmPay": "Confirm Booking & Pay",

  // ─── AI Planner page ──────────────────────────────────────
  "planner.duration": "Trip Duration",
  "planner.devoteeType": "Devotee Type",
  "planner.preferences": "Preferences",
  "planner.includeInItinerary": "Include in Itinerary",
  "planner.generate": "Generate My Itinerary",
  "planner.crafting": "Crafting Sacred Itinerary...",
  "planner.craftingHint": "SaiAI is crafting your sacred journey...",
  "planner.awaits": "Your Itinerary Awaits",
  "planner.saved": "Itinerary saved to your trips!",
  "planner.loginToSave": "Log in to save this itinerary to your trips.",
  "planner.emptyItinerary": "The server returned an empty itinerary. Please try again.",
  "planner.generateFailed": "Could not generate an itinerary. Please try again.",
  "planner.saveFailed": "Could not save the itinerary.",

  // ─── Payment (UPI) ────────────────────────────────────────
  "pay.scanTitle": "Scan & Pay",
  "pay.scanHint": "Scan the QR code with any UPI app",
  "pay.openApp": "Open UPI App",
  "pay.enterUtr": "Enter UTR / Reference No.",
  "pay.verify": "Verify Payment",
  "pay.verifying": "Verifying",
  "pay.success": "Payment Successful",
  "pay.failed": "Verification Failed",
  "pay.done": "Done",
  "pay.close": "Close",
} as const;

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;