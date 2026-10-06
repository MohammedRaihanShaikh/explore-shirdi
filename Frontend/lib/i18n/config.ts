/**
 * Region and language configuration for the pilgrim portal.
 *
 * CURRENCY IS ALWAYS INR BY DESIGN.
 * Razorpay orders, the UPI intent (`cu=INR` per the NPCI spec) and the
 * `payments.currency` column are all hardwired to INR on the backend. Letting
 * the UI display a converted amount would mean the UPI QR code says INR while
 * the screen says something else. So the region preference changes *how* an
 * INR amount is formatted (Indian lakh/crore grouping vs. Western), never
 * *what* currency it is.
 */

export type RegionId = "IN" | "US" | "AE" | "GB" | "SG";

export interface Region {
  id: RegionId;
  label: string;
  /** BCP-47 tag driving Intl number and date formatting. */
  locale: string;
  /** Long-form name, shown in the language picker. */
  endonym: string;
}

export const REGIONS: Region[] = [
  { id: "IN", label: "India", locale: "en-IN", endonym: "India" },
  { id: "US", label: "United States", locale: "en-US", endonym: "United States" },
  { id: "AE", label: "United Arab Emirates", locale: "en-AE", endonym: "United Arab Emirates" },
  { id: "GB", label: "United Kingdom", locale: "en-GB", endonym: "United Kingdom" },
  { id: "SG", label: "Singapore", locale: "en-SG", endonym: "Singapore" },
];

export const DEFAULT_REGION: RegionId = "IN";

export function getRegion(id: RegionId): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

export type LanguageId = "en" | "hi" | "mr";

export interface Language {
  id: LanguageId;
  /** Name in English, so an English speaker can find their language. */
  label: string;
  /** Name written in that language itself. */
  endonym: string;
  /** Value for <html lang>. */
  htmlLang: string;
  /** Devanagari renders slightly larger at the same font-size. */
  fontScale: boolean;
}

export const LANGUAGES: Language[] = [
  { id: "en", label: "English", endonym: "English", htmlLang: "en", fontScale: false },
  { id: "hi", label: "Hindi", endonym: "हिन्दी", htmlLang: "hi", fontScale: true },
  { id: "mr", label: "Marathi", endonym: "मराठी", htmlLang: "mr", fontScale: true },
];

export const DEFAULT_LANGUAGE: LanguageId = "en";

export function getLanguage(id: LanguageId): Language {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}

/** The only currency the portal charges in. */
export const CURRENCY = "INR";