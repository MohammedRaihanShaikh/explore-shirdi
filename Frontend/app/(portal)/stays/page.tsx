"use client";

/**
 * Luxury Stays & Ashrams — OTA-style listing.
 *
 * Layout follows the familiar hotel-listing pattern: a search bar, a featured
 * carousel, a filter rail and a numbered result list with price and
 * availability per property. The booking / payment / "my bookings" flow is
 * unchanged and still talks to the real backend.
 *
 * Prices and details come from `GET /api/stays/catalog`, the same catalog the
 * backend charges from, so the price shown here is the price charged. Amounts
 * are rendered through `formatMoney`, which groups them the way the pilgrim's
 * chosen region expects (Indian lakh/crore vs. Western thousands).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalFooter from "@/components/portal/PortalFooter";
import Image from "next/image";
import {
  Bed,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Wifi,
  Coffee,
  Car,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarDays,
  Users,
  ClipboardList,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { usePreferences } from "@/lib/i18n";
import type { PaymentOrder, StayBookingResponse, StayCatalogItem } from "@/lib/api";
import UpiQrModal from "@/components/pay/UpiQrModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const FALLBACK_IMAGE = "/shirdi-sanctum.jpg";

interface Stay {
  id: string;
  title: string;
  type: string;
  image: string;
  rating: number;
  distance: string;
  location: string;
  price: number;
  amenities: string[];
  tag: string;
  rooms: number;
  description: string;
}

/** Shown when the catalog endpoint is unreachable. Mirrors the backend seed. */
const FALLBACK_STAYS: Stay[] = [
  {
    id: "sai-ashram",
    title: "Shri Sai Baba Sansthan Ashram",
    type: "Sansthan Trust Accommodation",
    image: "/shirdi-sanctum.jpg",
    rating: 4.8,
    distance: "0.1 km from Samadhi Mandir",
    location: "Temple Road, Shirdi",
    price: 800,
    amenities: ["Sansthan Certified", "Satvik Meals Included", "Daily Aarti Alert"],
    tag: "Best Value",
    rooms: 40,
    description:
      "Official Sansthan Trust accommodation run by the Shri Sai Baba Sansthan. Simple, clean rooms steps from the Samadhi Mandir with satvik meals and daily aarti access.",
  },
  {
    id: "ibis-shirdi",
    title: "Radisson Blu Shirdi",
    type: "5-Star Luxury Hotel",
    image: "/samadhi-mandir.jpg",
    rating: 4.7,
    distance: "1.2 km from Samadhi Mandir",
    location: "Dongargaon Road, Shirdi",
    price: 4500,
    amenities: ["Pool & Spa", "Airport Shuttle", "Temple Transfer"],
    tag: "Luxury Pick",
    rooms: 120,
    description:
      "Five-star comfort a short drive from the temple, with an outdoor pool, spa, airport shuttle and dedicated temple transfer service.",
  },
  {
    id: "sai-leela",
    title: "Sai Leela Heritage Ashram",
    type: "Boutique Ashram",
    image: "/lendi-baug.jpg",
    rating: 4.6,
    distance: "0.4 km from Samadhi Mandir",
    location: "Lendi Baug Road, Shirdi",
    price: 1200,
    amenities: ["Meditation Hall", "Yoga Sessions", "Prasad Meals"],
    tag: "Spiritual Retreat",
    rooms: 24,
    description:
      "A quiet heritage ashram centred on meditation and yoga, serving fresh prasad meals to pilgrims staying for extended retreats.",
  },
  {
    id: "fortune-shirdi",
    title: "Fortune Park Sai Residency",
    type: "4-Star Business Hotel",
    image: "/chavadi.jpg",
    rating: 4.5,
    distance: "0.8 km from Samadhi Mandir",
    location: "Shirdi-Sai Nagar Road",
    price: 2800,
    amenities: ["Free Breakfast", "24/7 Concierge", "AC Rooms"],
    tag: "Popular Choice",
    rooms: 80,
    description:
      "A four-star business hotel with air-conditioned rooms, free breakfast and round-the-clock concierge support for families.",
  },
];

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "Pool & Spa": <Coffee className="w-3 h-3" />,
  "Airport Shuttle": <Car className="w-3 h-3" />,
  "Free Breakfast": <Coffee className="w-3 h-3" />,
  "Sansthan Certified": <ShieldCheck className="w-3 h-3" />,
  "Meditation Hall": <Wifi className="w-3 h-3" />,
  "24/7 Concierge": <ShieldCheck className="w-3 h-3" />,
};

/** Map an API catalog row onto the shape the page renders. */
function toStay(row: StayCatalogItem): Stay {
  return {
    id: row.id,
    title: row.name,
    type: row.category || "Stay",
    image: row.image || FALLBACK_IMAGE,
    rating: Number.isFinite(row.rating) ? row.rating : 0,
    distance: row.distance || "—",
    location: row.location || "Shirdi",
    price: Number.isFinite(row.price_per_night) ? row.price_per_night : 0,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    tag: "Sanctum Stay",
    rooms: row.total_rooms || 0,
    description: row.description || "",
  };
}

/** Pull the leading "0.4" out of "0.4 km from Samadhi Mandir" for sorting. */
function distanceKm(stay: Stay): number {
  const m = /([\d.]+)\s*km/i.exec(stay.distance || "");
  const v = m ? parseFloat(m[1]) : NaN;
  return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER;
}

type SortKey = "best" | "rating" | "price-asc" | "price-desc" | "distance";

const SORT_LABEL_KEYS: Record<SortKey, "stays.sort.best" | "stays.sort.rating" | "stays.sort.priceAsc" | "stays.sort.priceDesc" | "stays.sort.distance"> = {
  best: "stays.sort.best",
  rating: "stays.sort.rating",
  "price-asc": "stays.sort.priceAsc",
  "price-desc": "stays.sort.priceDesc",
  distance: "stays.sort.distance",
};

interface BookingForm {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  specialRequests: string;
}

/** Five-circle rating, filled proportionally — mirrors the OTA convention. */
function RatingBubbles({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i - 0.25;
        const half = !filled && rating >= i - 0.75;
        return (
          <span
            key={i}
            className={`${dim} rounded-full border ${
              filled
                ? "bg-amber-500 border-amber-500"
                : half
                  ? "bg-amber-200 border-amber-400"
                  : "bg-white border-slate-300"
            }`}
          />
        );
      })}
    </span>
  );
}

export default function StaysPage() {
  const { t, formatMoney, formatDate } = usePreferences();
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null);
  const [form, setForm] = useState<BookingForm>({
    checkIn: "",
    checkOut: "",
    guests: 1,
    rooms: 1,
    specialRequests: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<{ ref: string; total: number } | null>(null);
  const [error, setError] = useState("");
  const [payOrder, setPayOrder] = useState<{
    booking: StayBookingResponse;
    payment: PaymentOrder;
  } | null>(null);

  // Logged-in user's booking history (loaded from the backend)
  const [bookings, setBookings] = useState<StayBookingResponse[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Catalog + filters
  const [stays, setStays] = useState<Stay[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [sort, setSort] = useState<SortKey>("best");
  const [maxPrice, setMaxPrice] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const rows = await api.stays.catalog();
      if (Array.isArray(rows) && rows.length > 0) {
        setStays(rows.map(toStay));
      } else {
        setStays(FALLBACK_STAYS);
        setCatalogError(t("stays.chooseDates"));
      }
    } catch (e) {
      setStays(FALLBACK_STAYS);
      setCatalogError(formatApiError(e, t("common.backendDown")));
    } finally {
      setCatalogLoading(false);
    }
    // `t` is stable per language; re-running on language change keeps the
    // fallback message translated.
  }, [t]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const loadBookings = useCallback(async () => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setIsLoggedIn(false);
      setBookings([]);
      setBookingsError("");
      return;
    }
    setIsLoggedIn(true);
    setBookingsLoading(true);
    setBookingsError("");
    try {
      const res = await fetch(`${API_BASE}/stays/my-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setBookingsError("Your session has expired. Please log in again to view your bookings.");
        setBookings([]);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setBookings([]);
        setBookingsError(formatApiError(data, "Could not load your bookings."));
        return;
      }
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
      setBookingsError(t("common.backendDown"));
    } finally {
      setBookingsLoading(false);
    }
  }, [t]);

  // Load the current user's bookings whenever the page mounts / auth changes
  useEffect(() => {
    loadBookings();
    window.addEventListener("shirdi_auth_change", loadBookings);
    window.addEventListener("focus", loadBookings);
    return () => {
      window.removeEventListener("shirdi_auth_change", loadBookings);
      window.removeEventListener("focus", loadBookings);
    };
  }, [loadBookings]);

  const handleCancelBooking = async (bookingId: number) => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setBookingsError("Please log in to manage your bookings.");
      return;
    }
    setCancellingId(bookingId);
    try {
      const res = await fetch(`${API_BASE}/stays/${bookingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setBookingsError(formatApiError(data, "Could not cancel the booking."));
        return;
      }
      await loadBookings();
    } catch {
      setBookingsError(t("common.backendDown"));
    } finally {
      setCancellingId(null);
    }
  };

  const getNights = () => {
    if (!form.checkIn || !form.checkOut) return 0;
    const diff =
      (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) /
      (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor(diff));
  };

  const getTotal = () => {
    if (!selectedStay) return 0;
    return getNights() * form.rooms * selectedStay.price;
  };

  // Nights + total for the stay currently open in the booking modal.
  const nights = getNights();
  const total = getTotal();

  const validate = (): string => {
    if (!form.checkIn) return "Check-in date is required.";
    if (!form.checkOut) return "Check-out date is required.";
    if (new Date(form.checkIn) < new Date(today)) return "Check-in date cannot be in the past.";
    if (new Date(form.checkOut) <= new Date(form.checkIn))
      return "Check-out must be after check-in.";
    if (getNights() < 1) return "Minimum 1 night stay required.";
    if (form.guests < 1 || form.guests > 10) return "Number of guests must be between 1 and 10.";
    if (form.rooms < 1 || form.rooms > 5) return "Number of rooms must be between 1 and 5.";
    return "";
  };

  const openModal = (stay: Stay) => {
    setSelectedStay(stay);
    setError("");
    setSuccess(null);
  };

  const closeModal = () => {
    setSelectedStay(null);
    setSuccess(null);
    setError("");
  };

  const handleBook = async () => {
    setError("");
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setError(t("stays.loginToBook"));
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        stay_id: selectedStay!.id,
        stay_name: selectedStay!.title,
        check_in: new Date(form.checkIn).toISOString(),
        check_out: new Date(form.checkOut).toISOString(),
        num_guests: form.guests,
        num_rooms: form.rooms,
        total_price: getTotal(),
        special_requests: form.specialRequests || null,
      };

      const res = await fetch(`${API_BASE}/stays/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401) setError("Session expired. Please log in again.");
        else setError(formatApiError(data, "Booking failed. Please try again."));
        return;
      }

      // The booking is created PENDING. Open the UPI QR payment modal.
      const booking = data.booking;
      const payment = data.payment;

      if (payment.order_id || payment.upi_intent) {
        setPayOrder({ booking, payment });
        return;
      }

      // Fallback (should not happen): confirm directly.
      setSuccess({ ref: booking.booking_ref, total: booking.total_price });
      await loadBookings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("cancelled")) {
        setError("Payment was cancelled. Your booking was not confirmed.");
      } else {
        setError(t("common.backendDown"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpiVerified = async (utr: string): Promise<string> => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token || !payOrder) throw new Error("Session expired.");

    const res = await fetch(`${API_BASE}/payments/verify-upi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        entity_type: "stay",
        entity_id: payOrder.booking.id,
        utr,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(formatApiError(data, "Verification failed."));
    }

    setSuccess({ ref: payOrder.booking.booking_ref, total: payOrder.booking.total_price });
    setPayOrder(null);
    await loadBookings();
    return data.message as string;
  };

  // ── Filtering & sorting ───────────────────────────────────
  const priceCeiling = useMemo(
    () => (stays.length ? Math.max(...stays.map((s) => s.price)) : 0),
    [stays]
  );

  // maxPrice === 0 means "no cap". The slider still needs a concrete value, so
  // it shows the ceiling until the pilgrim drags it down.
  const effectiveMaxPrice = maxPrice === 0 ? priceCeiling : maxPrice;

  const allCategories = useMemo(
    () => Array.from(new Set(stays.map((s) => s.type))).sort(),
    [stays]
  );
  const allAmenities = useMemo(
    () => Array.from(new Set(stays.flatMap((s) => s.amenities))).sort(),
    [stays]
  );

  const filtered = useMemo(() => {
    const list = stays.filter((s) => {
      if (maxPrice > 0 && s.price > maxPrice) return false;
      if (minRating > 0 && s.rating < minRating) return false;
      if (categories.length && !categories.includes(s.type)) return false;
      if (amenityFilter.length && !amenityFilter.every((a) => s.amenities.includes(a)))
        return false;
      return true;
    });

    const sorted = [...list];
    switch (sort) {
      case "best":
        sorted.sort((a, b) => b.rating - a.rating || a.price - b.price);
        break;
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "distance":
        sorted.sort((a, b) => distanceKm(a) - distanceKm(b));
        break;
    }
    return sorted;
  }, [stays, maxPrice, minRating, categories, amenityFilter, sort]);

  const featured = useMemo(
    () => [...stays].sort((a, b) => b.rating - a.rating).slice(0, 6),
    [stays]
  );

  const activeFilterCount =
    (maxPrice > 0 && maxPrice < priceCeiling ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    categories.length +
    amenityFilter.length;

  const resetFilters = () => {
    setMaxPrice(priceCeiling);
    setMinRating(0);
    setCategories([]);
    setAmenityFilter([]);
  };

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const statusStyles: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    completed: "bg-slate-100 text-slate-700 border-slate-200",
  };

  // ── Filter rail contents (shared by desktop sidebar + mobile sheet) ──
  const filterControls = (
    <div className="flex flex-col gap-5">
      {/* Price */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
          {t("stays.filter.price")}
        </p>
        <input
          type="range"
          min={0}
          max={priceCeiling || 1}
          step={100}
          value={effectiveMaxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#A73710]"
          aria-label={t("stays.filter.price")}
        />
        <p className="text-[11px] text-slate-500 mt-1">
          {t("stays.filter.upTo", { amount: formatMoney(effectiveMaxPrice) })}
        </p>
      </div>

      {/* Rating */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
          {t("stays.filter.rating")}
        </p>
        <div className="flex flex-col gap-1">
          {[4.5, 4, 0].map((r) => (
            <label
              key={r}
              className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer"
            >
              <input
                type="radio"
                name="minRating"
                checked={minRating === r}
                onChange={() => setMinRating(r)}
                className="accent-[#A73710]"
              />
              {r === 0 ? (
                t("stays.filter.anyRating")
              ) : (
                <>
                  <RatingBubbles rating={r} />
                  <span>{r.toFixed(1)}+</span>
                </>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Category */}
      {allCategories.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
            {t("stays.filter.category")}
          </p>
          <div className="flex flex-col gap-1">
            {allCategories.map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={categories.includes(c)}
                  onChange={() => toggle(categories, setCategories, c)}
                  className="accent-[#A73710]"
                />
                <span className="truncate">{c}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Amenities */}
      {allAmenities.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
            {t("stays.filter.amenities")}
          </p>
          <div className="flex flex-col gap-1">
            {allAmenities.map((a) => (
              <label
                key={a}
                className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={amenityFilter.includes(a)}
                  onChange={() => toggle(amenityFilter, setAmenityFilter, a)}
                  className="accent-[#A73710]"
                />
                <span className="truncate">{a}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={resetFilters}
          className="self-start text-[11px] font-bold text-[#A73710] hover:underline"
        >
          {t("common.clearFilters")}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <PortalHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-6">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
            <Bed className="w-3.5 h-3.5 inline mr-1 text-[#C2410C]" />
            {t("stays.eyebrow")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight mb-2">
            {t("stays.title")}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            {t("stays.subtitle")}
          </p>
        </div>

        {/* Search bar — prefills the booking form */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-3 sm:p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                {t("stays.destination")}
              </label>
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50">
                <MapPin className="w-3.5 h-3.5 text-[#A73710]" />
                <span className="text-xs font-semibold text-slate-800">Shirdi</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                {t("stays.checkIn")}
              </label>
              <input
                type="date"
                min={today}
                value={form.checkIn}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    checkIn: e.target.value,
                    checkOut: f.checkOut && f.checkOut < e.target.value ? "" : f.checkOut,
                  }))
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                {t("stays.checkOut")}
              </label>
              <input
                type="date"
                min={form.checkIn || today}
                value={form.checkOut}
                onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                {t("stays.guests")}
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.guests}
                onChange={(e) =>
                  setForm((f) => ({ ...f, guests: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) }))
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                {t("stays.rooms")}
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={form.rooms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rooms: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) }))
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
              />
            </div>
          </div>
        </div>

        {catalogError && (
          <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{catalogError}</p>
          </div>
        )}

        {/* Featured rail */}
        {featured.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-serif font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#C2410C]" />
              {t("stays.featured")}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {featured.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openModal(s)}
                  className="shrink-0 w-44 sm:w-48 text-left bg-white border border-slate-200/80 rounded-xl overflow-hidden hover:shadow-md transition-shadow snap-start"
                >
                  <div className="relative aspect-square bg-slate-100">
                    <Image
                      src={s.image}
                      alt={s.title}
                      fill
                      priority={i === 0}
                      sizes="(max-width: 640px) 176px, 192px"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight mb-1">
                      {s.title}
                    </p>
                    <span className="flex items-center gap-1 mb-1">
                      <RatingBubbles rating={s.rating} />
                      <span className="text-[10px] font-bold text-slate-600">
                        {s.rating.toFixed(1)}
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {t("stays.from")}{" "}
                      <span className="font-bold text-slate-800">{formatMoney(s.price)}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Results: filter rail + list */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Desktop filter rail */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-[#A73710]" />
                {t("common.filters")}
              </h2>
              {filterControls}
            </div>
          </aside>

          <div>
            {/* Results header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-slate-900">
                  {filtered.length === 1
                    ? t("stays.countOne")
                    : t("stays.count", { count: filtered.length })}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {form.checkIn && form.checkOut
                    ? `${formatDate(form.checkIn)} → ${formatDate(form.checkOut)} · ${form.guests} guest${form.guests > 1 ? "s" : ""}, ${form.rooms} room${form.rooms > 1 ? "s" : ""}`
                    : t("stays.chooseDates")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-[#A73710] bg-white border border-slate-200 px-3 py-2 rounded-lg"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {t("common.filters")}
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#A73710] text-white text-[9px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                    {t("stays.sortBy")}
                  </span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                  >
                    {(Object.keys(SORT_LABEL_KEYS) as SortKey[]).map((k) => (
                      <option key={k} value={k}>
                        {t(SORT_LABEL_KEYS[k])}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Mobile filter sheet */}
            {filtersOpen && (
              <div
                className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-end"
                onClick={() => setFiltersOpen(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-900">{t("common.filters")}</h2>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      aria-label={t("common.close")}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {filterControls}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="mt-5 w-full bg-[#A73710] text-white font-bold py-2.5 rounded-xl text-sm"
                  >
                    {t("stays.count", { count: filtered.length })}
                  </button>
                </div>
              </div>
            )}

            {catalogLoading && stays.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[#A73710]" />
                {t("stays.loading")}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  {t("stays.noResults")}
                </p>
                <p className="text-xs text-slate-500 mb-4">{t("stays.noResultsHint")}</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-xs py-2 px-4 rounded-xl"
                >
                  {t("common.clearFilters")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filtered.map((stay, index) => (
                  <div
                    key={stay.id}
                    className="bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Rank + photo */}
                      <div className="relative sm:w-64 shrink-0">
                        <div className="relative aspect-[16/10] sm:aspect-auto sm:h-full bg-slate-100">
                          <Image
                            src={stay.image}
                            alt={stay.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 256px"
                            className="object-cover"
                          />
                          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white/95 text-[11px] font-bold text-slate-700 flex items-center justify-center shadow-sm">
                            {index + 1}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 p-4 sm:p-5 flex flex-col">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h3 className="text-base font-serif font-bold text-slate-900 leading-snug">
                            {stay.title}
                          </h3>
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                            <RatingBubbles rating={stay.rating} size="md" />
                            {stay.rating.toFixed(1)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 mb-2">
                          {stay.type} · {stay.location} · {stay.distance}
                        </p>

                        {stay.description && (
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                            {stay.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {stay.tag}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                            {t("stays.roomsLabel", { count: stay.rooms })}
                          </span>
                          {stay.amenities.map((a) => (
                            <span
                              key={a}
                              className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg"
                            >
                              {AMENITY_ICONS[a] || <ShieldCheck className="w-2.5 h-2.5" />}
                              {a}
                            </span>
                          ))}
                        </div>

                        <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap items-end justify-between gap-3">
                          <p className="text-xs text-slate-500">
                            <span className="text-[10px] uppercase tracking-wide text-slate-400 block">
                              {t("stays.perNight")}
                            </span>
                            <span className="text-xl font-bold text-[#A73710]">
                              {formatMoney(stay.price)}
                            </span>
                          </p>
                          <button
                            type="button"
                            onClick={() => openModal(stay)}
                            className="flex items-center gap-1.5 bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-colors shadow-xs"
                          >
                            {t("stays.checkAvailability")}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── My Stay Bookings (real data from the backend) ─── */}
        <section className="mt-14" id="my-bookings">
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#C2410C]" />
              {t("stays.myBookings")}
            </h2>
            <button
              type="button"
              onClick={loadBookings}
              disabled={bookingsLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-[#A73710] hover:text-[#7C2D12] bg-white border border-slate-200 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bookingsLoading ? "animate-spin" : ""}`} />
              {t("common.refresh")}
            </button>
          </div>

          {bookingsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{bookingsError}</p>
            </div>
          )}

          {bookingsLoading && bookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-[#A73710]" />
              {t("stays.loadingBookings")}
            </div>
          ) : !isLoggedIn ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <Bed className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 mb-1">{t("stays.signInToSee")}</p>
              <p className="text-xs text-slate-500 mb-4">{t("stays.signInToSeeHint")}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors"
              >
                {t("account.signIn")} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 mb-1">{t("stays.noBookings")}</p>
              <p className="text-xs text-slate-500">{t("stays.noBookingsHint")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bookings.map((b) => {
                const bookingNights = Math.max(
                  1,
                  Math.round(
                    (new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                );
                const canCancel = b.status === "confirmed" || b.status === "pending";
                return (
                  <div
                    key={b.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{b.stay_name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            statusStyles[b.status] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <CalendarDays className="w-3 h-3 text-[#A73710]" />
                        {formatDate(b.check_in)} → {formatDate(b.check_out)}
                        <span className="text-slate-300">•</span>
                        {bookingNights} night{bookingNights > 1 ? "s" : ""}
                        <span className="text-slate-300">•</span>
                        <Users className="w-3 h-3 text-[#A73710]" />
                        {b.num_guests} guest{b.num_guests > 1 ? "s" : ""}, {b.num_rooms} room{b.num_rooms > 1 ? "s" : ""}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">Ref: {b.booking_ref}</p>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                      <span className="text-base font-bold text-[#A73710]">
                        {formatMoney(b.total_price)}
                      </span>
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={cancellingId === b.id}
                          className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1"
                        >
                          {cancellingId === b.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          {t("stays.cancel")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <PortalFooter />

      {/* Booking Modal */}
      {selectedStay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-serif font-bold text-slate-900">{selectedStay.title}</h2>
                  <p className="text-xs text-slate-500">{selectedStay.type}</p>
                </div>
                <button onClick={closeModal} aria-label={t("common.close")} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success State */}
              {success ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{t("stays.bookingConfirmed")}</h3>
                  <p className="text-sm text-slate-600 mb-3">{t("stays.bookingConfirmedHint")}</p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left mb-4">
                    <p className="text-xs font-bold text-emerald-800 mb-1">{t("stays.bookingRef")}</p>
                    <p className="text-lg font-bold text-emerald-700 font-mono">{success.ref}</p>
                    <p className="text-xs text-emerald-600 mt-2">
                      {t("stays.totalPaid", { amount: formatMoney(success.total) })}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Save your booking reference. It is now stored in your account and listed under &ldquo;My Stay Bookings&rdquo; below.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        closeModal();
                        document.getElementById("my-bookings")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="flex-1 bg-white hover:bg-amber-50 text-[#A73710] font-bold py-2.5 rounded-xl text-sm border border-[#E7D6A7] transition-colors"
                    >
                      {t("stays.viewBookings")}
                    </button>
                    <button onClick={closeModal} className="flex-1 bg-[#A73710] text-white font-bold py-2.5 rounded-xl text-sm">
                      {t("stays.done")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  {/* Date Fields */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <CalendarDays className="w-3 h-3 inline mr-1" />{t("stays.checkIn")}
                      </label>
                      <input
                        type="date"
                        min={today}
                        value={form.checkIn}
                        onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <CalendarDays className="w-3 h-3 inline mr-1" />{t("stays.checkOut")}
                      </label>
                      <input
                        type="date"
                        min={form.checkIn || today}
                        value={form.checkOut}
                        onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                      />
                    </div>
                  </div>

                  {/* Guests & Rooms */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <Users className="w-3 h-3 inline mr-1" />{t("stays.guests")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={form.guests}
                        onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) || 1 })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <Bed className="w-3 h-3 inline mr-1" />{t("stays.rooms")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={form.rooms}
                        onChange={(e) => setForm({ ...form, rooms: parseInt(e.target.value) || 1 })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                      />
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t("stays.specialRequests")}
                    </label>
                    <textarea
                      value={form.specialRequests}
                      onChange={(e) => setForm({ ...form, specialRequests: e.target.value })}
                      placeholder={t("stays.specialRequestsPlaceholder")}
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30 resize-none"
                    />
                  </div>

                  {/* Price Summary */}
                  {nights > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                      <div className="flex justify-between text-xs text-amber-900 mb-1">
                        <span>
                          {formatMoney(selectedStay.price)} x {nights} night{nights > 1 ? "s" : ""} x {form.rooms} room{form.rooms > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-900">{t("stays.totalAmount")}</span>
                        <span className="text-lg font-bold text-[#A73710]">{formatMoney(total)}</span>
                      </div>
                    </div>
                  )}

                  {/* Confirm Button */}
                  <button
                    onClick={handleBook}
                    disabled={isLoading}
                    className="w-full bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t("stays.confirming")}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t("stays.confirmBooking")}</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center mt-2">{t("stays.secureNote")}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPI QR Payment Modal */}
      {payOrder && (
        <UpiQrModal
          open={!!payOrder}
          onClose={() => setPayOrder(null)}
          upiIntent={payOrder.payment.upi_intent}
          upiId={payOrder.payment.upi_id}
          amount={payOrder.payment.amount}
          receipt={payOrder.payment.receipt}
          onVerify={handleUpiVerified}
        />
      )}
    </div>
  );
}