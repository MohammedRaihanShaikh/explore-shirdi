"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  Landmark,
  Compass,
  ExternalLink,
  Phone,
  HeartPulse,
  Plane,
  Accessibility,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandLogo";
import { usePreferences } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";

/** The one trust helpline used across the portal. */
const HELPLINE_DISPLAY = "+91 2423 258 500";
const HELPLINE_TEL = "tel:+912423258500";

/** Open a place in Google Maps without hard-coding a coordinate or URL. */
function mapsLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type Essential = {
  labelKey: TranslationKey;
  /** Short value shown on the right of the row. */
  valueKey?: TranslationKey;
  /** Literal value, used when the text is a phone number rather than prose. */
  value?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  href?: string;
  external?: boolean;
};

/**
 * Essentials rows only carry a link when there is a real destination to send
 * the pilgrim to. Entries without one render as plain text rather than a dead
 * `href="#"` that pretends to be clickable.
 */
const ESSENTIALS: Essential[] = [
  {
    labelKey: "footer.trust.name",
    valueKey: "footer.trust.official",
    icon: Landmark,
    iconClass: "text-amber-400",
    href: "https://online.sai.org.in",
    external: true,
  },
  {
    labelKey: "footer.trust.helpline",
    value: HELPLINE_DISPLAY,
    icon: Phone,
    iconClass: "text-emerald-400",
    href: HELPLINE_TEL,
  },
  {
    labelKey: "footer.hospital",
    valueKey: "footer.hospitalValue",
    icon: HeartPulse,
    iconClass: "text-red-400",
  },
  {
    labelKey: "footer.police",
    valueKey: "footer.policeValue",
    icon: ShieldCheck,
    iconClass: "text-blue-400",
  },
  {
    labelKey: "footer.airport",
    valueKey: "footer.airportValue",
    icon: Plane,
    iconClass: "text-sky-400",
    href: mapsLink("Shirdi International Airport SAG"),
    external: true,
  },
  {
    labelKey: "footer.accessibility",
    valueKey: "footer.accessibilityValue",
    icon: Accessibility,
    iconClass: "text-emerald-400",
    href: "/darshan",
  },
];

/** Aarti times are fixed; only the labels need translating. */
const TIMINGS: { labelKey: TranslationKey; value: string; highlight?: boolean }[] = [
  { labelKey: "footer.aarti.kakad", value: "04:30 AM" },
  { labelKey: "footer.aarti.madhyan", value: "12:00 PM" },
  { labelKey: "footer.aarti.dhoop", value: "Sunset (06:15 PM)" },
  { labelKey: "footer.aarti.shej", value: "10:00 PM" },
  { labelKey: "footer.darshan.general", value: "05:15 AM – 11:30 PM", highlight: true },
];

const PORTAL_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/dashboard", labelKey: "nav.home" },
  { href: "/attractions", labelKey: "nav.attractions" },
  { href: "/darshan", labelKey: "nav.darshan" },
  { href: "/stays", labelKey: "nav.stays" },
  { href: "/dining", labelKey: "nav.dining" },
  { href: "/ai-planner", labelKey: "nav.planner" },
];

/**
 * Column heading. Every column uses this so the icons share one baseline and
 * the label always sits the same distance above its first row.
 */
function ColumnHeading({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
      <Icon className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
      <span>{children}</span>
    </h4>
  );
}

/** One label/value row. Shared by the timings and essentials columns. */
function DataRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-800/60 last:border-b-0 py-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-semibold text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function PortalFooter() {
  const { t } = usePreferences();
  const year = new Date().getFullYear();
  const essentials = ESSENTIALS.map((e) => ({
    ...e,
    label: t(e.labelKey),
    value: e.value ?? (e.valueKey ? t(e.valueKey) : ""),
  }));

  return (
    <footer className="w-full bg-[#0D1524] text-slate-300 pt-10 sm:pt-14 pb-6 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Col 1: Brand, blurb & helpline */}
          <div className="flex flex-col gap-3">
            <Link href="/dashboard" className="group flex items-center gap-2.5 w-fit">
              <BrandMark size="sm" onDark />
              <span className="font-serif font-bold text-base text-white">
                Explore Shirdi
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">{t("footer.about")}</p>
            <a
              href={HELPLINE_TEL}
              className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs transition-colors hover:border-amber-500/40 hover:bg-slate-900"
            >
              <Phone className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-slate-400">{t("footer.helpline")}</span>
              <span className="font-bold text-[#F59E0B]">{HELPLINE_DISPLAY}</span>
            </a>
          </div>

          {/* Col 2: Sanctum Timings */}
          <div className="flex flex-col gap-3">
            <ColumnHeading icon={Clock}>{t("footer.timings")}</ColumnHeading>
            <div className="flex flex-col">
              {TIMINGS.map((row) => (
                <DataRow
                  key={row.labelKey}
                  label={t(row.labelKey)}
                  value={row.value}
                  valueClass={row.highlight ? "text-emerald-400" : "text-amber-400"}
                />
              ))}
            </div>
          </div>

          {/* Col 3: Sansthan & Essentials */}
          <div className="flex flex-col gap-3">
            <ColumnHeading icon={Landmark}>{t("footer.essentials")}</ColumnHeading>
            <ul className="flex flex-col">
              {essentials.map((item) => {
                const Icon = item.icon;
                const label = (
                  <>
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${item.iconClass}`} />
                    <span className="truncate">{item.label}</span>
                  </>
                );

                return (
                  <li
                    key={item.label}
                    className="border-b border-slate-800/60 last:border-b-0"
                  >
                    {item.href ? (
                      item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between gap-3 py-1.5 text-xs transition-colors hover:text-amber-400"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {label}
                          </span>
                          <span className="flex flex-shrink-0 items-center gap-1 font-semibold text-slate-300 group-hover:text-amber-400">
                            {item.value}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="group flex items-center justify-between gap-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-amber-400"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {label}
                          </span>
                          <span className="flex flex-shrink-0 items-center gap-1 font-semibold text-slate-300 group-hover:text-amber-400">
                            {item.value}
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </span>
                        </Link>
                      )
                    ) : (
                      // No real destination — shown as information, not a
                      // link that goes nowhere.
                      <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
                        <span className="flex min-w-0 items-center gap-2 text-slate-400">
                          {label}
                        </span>
                        <span className="flex-shrink-0 font-semibold text-slate-500">
                          {item.value}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Col 4: Portal navigation */}
          <div className="flex flex-col gap-3">
            <ColumnHeading icon={Compass}>{t("footer.explore")}</ColumnHeading>
            <ul className="flex flex-col gap-2">
              {PORTAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-slate-400 transition-colors hover:text-amber-400"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3">
          <p>
            &copy; {year} Explore Shirdi Devotional Gateway. {t("footer.rights")}
          </p>
          <p className="text-slate-600">{t("footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  );
}