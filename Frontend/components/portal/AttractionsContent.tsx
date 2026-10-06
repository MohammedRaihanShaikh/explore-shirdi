"use client";

/**
 * Discover & Attractions grid.
 *
 * The page previously hard-coded its cards and rendered a "View" button with
 * no handler at all, so the control did nothing. This component now:
 *   - loads the sacred sites from `GET /api/places` (the same admin-managed
 *     data the admin panel writes), falling back to the built-in catalogue
 *     when the backend is unreachable so the page is never blank;
 *   - adds search + category filters;
 *   - makes "View" open a detail sheet for the selected site.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  MapPin,
  Star,
  Clock,
  ArrowRight,
  X,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Navigation,
  Sun,
  Info,
} from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import type { PlaceItem } from "@/lib/api";
import { usePreferences } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";

/** Shape used by the grid — the API rows and the fallback rows share it. */
interface Site {
  id: number | string;
  slug: string;
  title: string;
  category: string;
  description: string;
  distance: string;
  duration: string;
  rating: number;
  image: string;
}

/**
 * Extra pilgrim-facing detail shown in the "View" sheet. The prose lives in the
 * translation dictionaries so it switches with the language preference; the
 * fallback slug is used for any place an admin adds without a dictionary entry.
 */
type Slug = "samadhi-mandir" | "dwarkamai" | "chavadi" | "lendi-baug" | "shani-shingnapur" | "trimbakeshwar";

/** Slugs that have hand-written pilgrim detail in the dictionaries. */
const DETAILED_SLUGS: Slug[] = [
  "samadhi-mandir",
  "dwarkamai",
  "chavadi",
  "lendi-baug",
  "shani-shingnapur",
  "trimbakeshwar",
];

function detailSlug(slug: string): Slug | null {
  return DETAILED_SLUGS.includes(slug as Slug) ? (slug as Slug) : null;
}

const DEFAULT_IMAGE = "/shirdi-sanctum.jpg";

/** Sentinel for "no category filter". Never rendered as text. */
const ALL_CATEGORIES = "__all__";

/**
 * Shown when `GET /api/places` is down or empty. Mirrors the backend
 * `PLACES_CATALOG` seed so the page still has something to render.
 */
const FALLBACK_SITES: Site[] = [
  {
    id: "samadhi-mandir",
    slug: "samadhi-mandir",
    title: "Shri Samadhi Mandir",
    category: "Main Sanctum",
    image: "/samadhi-mandir.jpg",
    distance: "0 km (Sanctum)",
    rating: 4.9,
    duration: "1–2 hrs",
    description:
      "The divine resting place of Shri Sai Baba, adorned with Italian marble, gold spire and daily sacred Aartis. The heartbeat of all pilgrimages to Shirdi.",
  },
  {
    id: "dwarkamai",
    slug: "dwarkamai",
    title: "Dwarkamai Masjid",
    category: "Eternal Dhuni",
    image: "/dwarkamai.jpg",
    distance: "0.2 km",
    rating: 4.8,
    duration: "30–45 mins",
    description:
      "The rustic mosque where Baba lived for over 60 years. The eternal Dhuni Maa flame has burned without interruption since Baba's era.",
  },
  {
    id: "chavadi",
    slug: "chavadi",
    title: "Chavadi Sanctuary",
    category: "Palkhi Tradition",
    image: "/chavadi.jpg",
    distance: "0.3 km",
    rating: 4.7,
    duration: "20–30 mins",
    description:
      "Where Baba spent alternate nights during the last decade of his life. Famous for the historic Thursday Palkhi procession with wooden decor.",
  },
  {
    id: "lendi-baug",
    slug: "lendi-baug",
    title: "Lendi Baug & Nanda Deep",
    category: "Sacred Gardens",
    image: "/lendi-baug.jpg",
    distance: "0.4 km",
    rating: 4.6,
    duration: "45–60 mins",
    description:
      "The serene botanical garden tended by Baba's own hands. Features the ceaseless Nanda Deep oil lamp encased in glass and marble platform.",
  },
  {
    id: "shani-shingnapur",
    slug: "shani-shingnapur",
    title: "Shani Shingnapur",
    category: "Sacred Circuit",
    image: "/shirdi-sanctum.jpg",
    distance: "65 km",
    rating: 4.7,
    duration: "Half Day Trip",
    description:
      "Ancient Shani temple village — famously a village without doors. An essential pilgrimage extension from Shirdi by AC coach.",
  },
  {
    id: "trimbakeshwar",
    slug: "trimbakeshwar",
    title: "Trimbakeshwar Jyotirlinga",
    category: "Sacred Circuit",
    image: "/shirdi-sanctum.jpg",
    distance: "160 km",
    rating: 4.8,
    duration: "Full Day Trip",
    description:
      "One of the 12 Jyotirlingas of India, situated near the source of the Godavari river, surrounded by the Brahmagiri hills.",
  },
];

/** Tailwind classes must appear verbatim so the scanner picks them up. */
const CATEGORY_PALETTE = [
  "bg-amber-100 text-amber-900 border-amber-200",
  "bg-orange-100 text-orange-900 border-orange-200",
  "bg-emerald-100 text-emerald-900 border-emerald-200",
  "bg-indigo-100 text-indigo-900 border-indigo-200",
  "bg-rose-100 text-rose-900 border-rose-200",
  "bg-sky-100 text-sky-900 border-sky-200",
];

/** Stable colour per category, so a category always looks the same. */
function categoryStyle(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

/** Normalize an API row into the shape the grid renders. */
function toSite(place: PlaceItem): Site {
  return {
    id: place.id,
    slug: place.slug,
    title: place.title,
    category: place.category || "Sacred Site",
    description: place.description || "",
    distance: place.distance || "—",
    duration: place.duration || "—",
    rating: Number.isFinite(place.rating) ? place.rating : 0,
    image: place.image || DEFAULT_IMAGE,
  };
}

/**
 * `next/image` only serves local assets and allow-listed remote hosts. Admin
 * entries can hold anything, so anything else degrades to a placeholder rather
 * than throwing an image error over the whole grid.
 */
function SiteImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const path = src.trim() || DEFAULT_IMAGE;
  const isLocal = path.startsWith("/") && !path.startsWith("//");
  const isAllowlistedRemote = path.startsWith("https://images.unsplash.com/");

  if (failed || (!isLocal && !isAllowlistedRemote)) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-[#FDFBF7] flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-[#C2410C]/40" />
      </div>
    );
  }

  return (
    <Image
      src={path}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className="object-cover group-hover:scale-105 transition-transform duration-700"
    />
  );
}

export default function AttractionsContent() {
  const { t } = usePreferences();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [selected, setSelected] = useState<Site | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.content.places();
      if (Array.isArray(data) && data.length > 0) {
        setSites(data.map(toSite));
        setUsingFallback(false);
      } else {
        setSites(FALLBACK_SITES);
        setUsingFallback(true);
        setError(t("attractions.emptyPublished"));
      }
    } catch (e) {
      setSites(FALLBACK_SITES);
      setUsingFallback(true);
      setError(formatApiError(e, t("common.backendDown")));
    } finally {
      setLoading(false);
    }
    // Re-runs on language change so the fallback message stays translated.
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Escape closes the detail sheet; the page behind it must not scroll.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  const categories = useMemo(() => {
    const unique = new Set(sites.map((site) => site.category));
    return [ALL_CATEGORIES, ...Array.from(unique)];
  }, [sites]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sites
      .filter((site) => category === ALL_CATEGORIES || site.category === category)
      .filter((site) =>
        !needle
          ? true
          : `${site.title} ${site.category} ${site.description}`
              .toLowerCase()
              .includes(needle)
      )
      .sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title));
  }, [sites, category, query]);

  const slug = selected ? detailSlug(selected.slug) : null;
  const detail = {
    bestTime: t(slug ? `attractions.best.${slug}` : "attractions.best.default"),
    tip: t(slug ? `attractions.tip.${slug}` : "attractions.tip.default"),
    // Known sites get four highlights; an admin-added site gets two.
    highlights: slug
      ? ([1, 2, 3, 4] as const).map((n) => t(`attractions.hl.${slug}.${n}`))
      : [t("attractions.hl.default.1"), t("attractions.hl.default.2")],
  };

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Page Header */}
      <div className="mb-8">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
          <Sparkles className="w-3.5 h-3.5 inline mr-1 text-[#C2410C]" />
          {t("attractions.eyebrow")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight mb-2">
          {t("attractions.title")}
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          {t("attractions.subtitle")}
        </p>
      </div>

      {/* Toolbar — search, category filter, refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("attractions.searchPlaceholder")}
            aria-label="Search sacred sites"
            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/30 focus:border-[#A73710]/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                category === c
                  ? "bg-[#A73710] text-white border-[#A73710]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#A73710]/40 hover:text-[#A73710]"
              }`}
            >
              {c === ALL_CATEGORIES ? t("attractions.allCategories") : c}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 self-start lg:self-auto text-[11px] font-bold text-[#A73710] bg-white border border-slate-200 hover:bg-amber-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Attractions Grid */}
      {loading && sites.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#A73710]" />
          {t("attractions.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 mb-1">{t("attractions.noResults")}</p>
          <p className="text-xs text-slate-500">
            {t("attractions.noResultsHint")}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory(ALL_CATEGORIES);
            }}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors"
          >
            {t("common.clearFilters")}
          </button>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-slate-500 mb-3">
            {t("attractions.showing", { shown: filtered.length, total: sites.length })}
            {usingFallback ? ` (${t("attractions.builtIn")})` : ""}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filtered.map((site, index) => (
              <div
                key={site.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col"
              >
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <SiteImage
                    src={site.image}
                    alt={site.title}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={index < 3}
                  />
                  <div className="absolute top-3 left-3">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${categoryStyle(
                        site.category
                      )}`}
                    >
                      {site.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-base font-serif font-bold text-slate-900 group-hover:text-[#A73710] transition-colors mb-1.5">
                      {site.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      {t(`attractions.desc.${detailSlug(site.slug) ?? "default"}`)}
                    </p>
                  </div>

                  {/* Meta Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#A73710]" />
                      {site.distance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {site.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {site.duration}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelected(site)}
                      aria-label={`View details for ${site.title}`}
                      className="flex items-center gap-0.5 text-[#A73710] font-bold hover:underline"
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail Sheet */}
      {selected && detail && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.title} details`}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 group">
              <SiteImage
                src={selected.image}
                alt={selected.title}
                sizes="(max-width: 640px) 100vw, 512px"
              />
              <div className="absolute top-3 left-3">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${categoryStyle(
                    selected.category
                  )}`}
                >
                  {selected.category}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-serif font-bold text-slate-900">
                    {selected.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{selected.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mb-4 pb-4 border-b border-slate-100">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#A73710]" />
                  {selected.distance}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  {selected.rating.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {selected.duration}
                </span>
              </div>

              {selected.description && (
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {t(`attractions.desc.${slug ?? "default"}`)}
                </p>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
                <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <Sun className="w-3.5 h-3.5" />
                  {t("attractions.bestTime")}
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">{detail.bestTime}</p>
              </div>

              <div className="mb-4">
                <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
                  {t("attractions.highlights")}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {detail.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C2410C]/40 mt-1.5 flex-shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5">
                <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  {t("attractions.tip")}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">{detail.tip}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href="/darshan"
                  onClick={() => setSelected(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-xs py-2.5 rounded-xl transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  {t("attractions.bookDarshan")}
                </Link>
                <Link
                  href="/ai-planner"
                  onClick={() => setSelected(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-[#E7D6A7] hover:bg-amber-50 text-[#A73710] font-bold text-xs py-2.5 rounded-xl transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("attractions.planVisit")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}