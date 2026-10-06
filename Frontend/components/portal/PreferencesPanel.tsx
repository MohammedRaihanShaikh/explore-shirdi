"use client";

/**
 * Region & language preferences, opened from the globe control in the header.
 *
 * Currency is intentionally NOT selectable: the backend charges INR only
 * (Razorpay order currency, the UPI intent's `cu=INR`, and the payments table).
 * The panel states that plainly and shows the active currency read-only.
 */
import React, { useEffect, useRef, useState } from "react";
import { Globe, Check, MapPin, Languages, IndianRupee, Info } from "lucide-react";
import { usePreferences } from "@/lib/i18n";
import { CURRENCY, LANGUAGES, REGIONS } from "@/lib/i18n/config";

export default function PreferencesPanel() {
  const { t, region, language, setRegion, setLanguage } = usePreferences();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Outside click + Escape close the panel.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeRegion = REGIONS.find((r) => r.id === region) ?? REGIONS[0];
  const activeLanguage = LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0];

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t("prefs.title")}
        title={t("prefs.title")}
        className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-600 transition-colors hover:border-[#A73710]/40 hover:text-[#A73710] focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
      >
        <Globe className="w-4 h-4 flex-shrink-0" />
        <span className="text-[11px] font-bold max-w-[5.5rem] truncate">
          {activeLanguage.endonym}
        </span>
      </button>

      {/* Mobile: compact icon-only trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("prefs.title")}
        className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <Globe className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("prefs.title")}
          className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-[#FCFAF6] to-white">
            <h2 className="text-sm font-serif font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#A73710]" />
              {t("prefs.title")}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{t("prefs.subtitle")}</p>
          </div>

          <div className="p-2">
            {/* Region */}
            <section className="mb-1">
              <p className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <MapPin className="w-3 h-3" />
                {t("prefs.region")}
                <span className="font-normal normal-case tracking-normal text-slate-300 ml-1">
                  · {t("prefs.regionHint")}
                </span>
              </p>
              <ul>
                {REGIONS.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setRegion(r.id)}
                      aria-pressed={region === r.id}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        region === r.id
                          ? "bg-amber-50 text-[#A73710] font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{r.endonym}</span>
                      {region === r.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Language */}
            <section className="mb-1 border-t border-slate-100 pt-1">
              <p className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <Languages className="w-3 h-3" />
                {t("prefs.language")}
                <span className="font-normal normal-case tracking-normal text-slate-300 ml-1">
                  · {t("prefs.languageHint")}
                </span>
              </p>
              <ul>
                {LANGUAGES.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setLanguage(l.id)}
                      aria-pressed={language === l.id}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        language === l.id
                          ? "bg-amber-50 text-[#A73710] font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>
                        {l.endonym}
                        {l.id !== "en" && (
                          <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                            {l.label}
                          </span>
                        )}
                      </span>
                      {language === l.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Currency — read-only, with the reason stated */}
            <section className="border-t border-slate-100 pt-1">
              <p className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                <IndianRupee className="w-3 h-3" />
                {t("prefs.currency")}
              </p>
              <div className="px-2.5 py-2">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                  <span className="text-xs font-bold text-slate-800">
                    {CURRENCY} — Indian Rupee
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ₹
                  </span>
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-[10px] text-slate-500 leading-relaxed">
                  <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-400" />
                  <span>{t("prefs.currencyNote")}</span>
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {t("prefs.region")}: {activeRegion.endonym}
                </p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}