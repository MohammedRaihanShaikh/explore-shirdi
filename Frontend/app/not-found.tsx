import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found — Explore Shirdi",
  description: "The page you are looking for could not be found. Return to the Explore Shirdi devotee portal.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center px-4 text-center">
      {/* Decorative Om symbol */}
      <div className="text-[120px] leading-none select-none mb-4 opacity-10 text-[#A73710]">ॐ</div>

      <span className="text-[11px] font-bold tracking-widest uppercase text-[#B45309] block mb-2">
        404 — Page Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight mb-3">
        This path leads elsewhere
      </h1>

      <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-8">
        The page you are seeking could not be found. It may have moved, been
        removed, or the link may be incorrect. Please return to the portal and
        continue your sacred journey.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm"
        >
          ← Return to Portal
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 border border-slate-200 hover:border-[#A73710]/30 text-slate-700 hover:text-[#A73710] font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
        >
          Contact Support
        </Link>
      </div>

      <p className="mt-10 text-[11px] text-slate-400">
        Helpline:{" "}
        <a href="tel:+912423258500" className="text-[#A73710] font-semibold hover:underline">
          +91 2423 258 500
        </a>
      </p>
    </div>
  );
}
