"use client";

/**
 * Preferences: region + language, persisted to localStorage.
 *
 * Region never changes the currency — everything is charged in INR by the
 * backend (Razorpay orders, the UPI intent's `cu=INR`, the payments table).
 * It only changes how an INR amount is rendered: an Indian locale groups by
 * lakh/crore (₹1,20,000) while a Western locale uses thousands (₹120,000).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CURRENCY,
  DEFAULT_LANGUAGE,
  DEFAULT_REGION,
  LANGUAGES,
  REGIONS,
  getLanguage,
  getRegion,
  type LanguageId,
  type RegionId,
} from "./config";
import { en, type Dictionary, type TranslationKey } from "./en";
import { hi } from "./hi";
import { mr } from "./mr";

const DICTIONARIES: Record<LanguageId, Dictionary> = { en, hi, mr };

const STORAGE_KEY = "shirdi_preferences";

interface StoredPreferences {
  region: RegionId;
  language: LanguageId;
}

interface PreferencesValue extends StoredPreferences {
  /** Translate a key, interpolating `{name}` placeholders. */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /** Format an INR amount using the region's grouping and symbol. */
  formatMoney: (amount: number | null | undefined, opts?: { compact?: boolean }) => string;
  /** Format a date using the region's locale. */
  formatDate: (value: string | Date | null | undefined, style?: "short" | "long") => string;
  setRegion: (id: RegionId) => void;
  setLanguage: (id: LanguageId) => void;
  reset: () => void;
  /** True when the UI is not in English, so pages can pick a font stack. */
  isTransliterated: boolean;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

function isRegionId(value: unknown): value is RegionId {
  return REGIONS.some((r) => r.id === value);
}

function isLanguageId(value: unknown): value is LanguageId {
  return LANGUAGES.some((l) => l.id === value);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState<RegionId>(DEFAULT_REGION);
  const [language, setLanguageState] = useState<LanguageId>(DEFAULT_LANGUAGE);

  // Rehydrate on mount. Guarded so a malformed value cannot crash the app.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
      if (isRegionId(parsed.region)) setRegionState(parsed.region);
      if (isLanguageId(parsed.language)) setLanguageState(parsed.language);
    } catch {
      /* ignore malformed preferences */
    }
  }, []);

  const persist = useCallback((next: StoredPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode — preferences simply won't persist */
    }
  }, []);

  const setRegion = useCallback(
    (id: RegionId) => {
      setRegionState(id);
      persist({ region: id, language });
    },
    [language, persist]
  );

  const setLanguage = useCallback(
    (id: LanguageId) => {
      setLanguageState(id);
      persist({ region, language: id });
    },
    [region, persist]
  );

  const reset = useCallback(() => {
    setRegionState(DEFAULT_REGION);
    setLanguageState(DEFAULT_LANGUAGE);
    persist({ region: DEFAULT_REGION, language: DEFAULT_LANGUAGE });
  }, [persist]);

  // Keep the document in sync: <html lang> drives screen-reader pronunciation
  // and offers the right translation to the browser.
  const activeLanguage = getLanguage(language);
  useEffect(() => {
    document.documentElement.lang = activeLanguage.htmlLang;
  }, [activeLanguage.htmlLang]);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const template = DICTIONARIES[language][key] ?? en[key] ?? key;
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        params[name] !== undefined ? String(params[name]) : match
      );
    },
    [language]
  );

  const locale = getRegion(region).locale;

  const formatMoney = useCallback(
    (amount: number | null | undefined, opts?: { compact?: boolean }) => {
      const value = Number(amount);
      if (!Number.isFinite(value)) return "—";
      const formatted = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: CURRENCY,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 0,
        ...(opts?.compact && Math.abs(value) >= 100000
          ? { notation: "compact", maximumFractionDigits: 1 }
          : {}),
      }).format(value);
      // Indian locales render "₹1,20,000"; some engines add a space before the
      // symbol. Trim it so it matches the rest of the UI.
      return formatted.replace(/\s+/g, " ").replace("₹ ", "₹").trim();
    },
    [locale]
  );

  const formatDate = useCallback(
    (value: string | Date | null | undefined,
     style: "short" | "long" = "short") => {
      if (!value) return "—";
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return "—";
      return new Intl.DateTimeFormat(
        locale,
        style === "long"
          ? { day: "2-digit", month: "short", year: "numeric" }
          : { day: "2-digit", month: "short" }
      ).format(d);
    },
    [locale]
  );

  const value = useMemo<PreferencesValue>(
    () => ({
      region,
      language,
      t,
      formatMoney,
      formatDate,
      setRegion,
      setLanguage,
      reset,
      isTransliterated: language !== "en",
    }),
    [region, language, t, formatMoney, formatDate, setRegion, setLanguage, reset]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used inside <PreferencesProvider>.");
  }
  return ctx;
}

/** Convenience hook for components that only need the translator. */
export function useI18n() {
  return usePreferences();
}