import React from "react";

/**
 * The one brand mark for Explore Shirdi.
 *
 * This was previously an inline "OM" in a gradient circle copy-pasted into
 * PortalHeader, PortalFooter, AuthLayout and AdminShell — four slightly
 * different versions of the same thing. Every surface now renders this
 * component instead, so the logo is changed in exactly one place.
 *
 * The mark itself is unchanged: a saffron-to-gold gradient disc ringed in gold,
 * carrying the ॐ glyph.
 */

type LogoSize = "sm" | "md" | "lg";

interface BrandMarkProps {
  size?: LogoSize;
  /** Sits on a dark background (footer, admin), so the inner disc goes dark. */
  onDark?: boolean;
  className?: string;
}

const MARK_SIZE: Record<LogoSize, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

const GLYPH_SIZE: Record<LogoSize, string> = {
  sm: "text-[15px]",
  md: "text-lg",
  lg: "text-2xl",
};

/** Just the emblem — no wordmark. */
export function BrandMark({ size = "md", onDark = false, className = "" }: BrandMarkProps) {
  return (
    <div
      className={`${MARK_SIZE[size]} rounded-full bg-gradient-to-tr from-[#EA580C] via-[#F59E0B] to-[#FBBF24] p-0.5 shadow-sm flex items-center justify-center flex-shrink-0 ${className}`}
      aria-hidden="true"
    >
      <div
        className={`w-full h-full rounded-full flex items-center justify-center ${
          onDark ? "bg-[#0D1524]" : "bg-white"
        }`}
      >
        <span
          className={`${GLYPH_SIZE[size]} leading-none select-none font-serif font-black ${
            onDark ? "text-[#F59E0B]" : "text-[#C2410C]"
          }`}
        >
          ॐ
        </span>
      </div>
    </div>
  );
}

interface BrandLogoProps {
  size?: LogoSize;
  /** Small caps line under the wordmark, e.g. "Admin Panel". */
  subtitle?: string;
  onDark?: boolean;
  className?: string;
}

/** Emblem + "Explore Shirdi" wordmark, stacked as one unit. */
export default function BrandLogo({
  size = "md",
  subtitle = "Sacred Sanctuary Portal",
  onDark = false,
  className = "",
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BrandMark size={size} onDark={onDark} />
      <div className="flex flex-col">
        <span
          className={`font-serif font-bold text-lg tracking-tight leading-tight transition-colors ${
            onDark ? "text-white" : "text-slate-900 group-hover:text-[#A73710]"
          }`}
        >
          Explore Shirdi
        </span>
        <span
          className={`text-[9px] font-bold uppercase ${
            onDark ? "text-amber-400/70" : "text-[#B45309]"
          } tracking-[0.18em]`}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}