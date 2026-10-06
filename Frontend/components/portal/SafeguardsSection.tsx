"use client";

import React from "react";
import { ShieldCheck, Receipt, Accessibility, Headphones } from "lucide-react";
import { usePreferences } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";

export default function SafeguardsSection() {
  const { t } = usePreferences();

  const safeguards: {
    id: string;
    titleKey: TranslationKey;
    descriptionKey: TranslationKey;
    icon: React.ReactNode;
    bg: string;
  }[] = [
    {
      id: "certified",
      titleKey: "safeguards.certified.title",
      descriptionKey: "safeguards.certified.description",
      icon: <ShieldCheck className="w-5 h-5 text-orange-600" />,
      bg: "bg-[#FFF4EC] border-orange-200/70",
    },
    {
      id: "zero-commission",
      titleKey: "safeguards.commission.title",
      descriptionKey: "safeguards.commission.description",
      icon: <Receipt className="w-5 h-5 text-amber-600" />,
      bg: "bg-[#FEFCE8] border-amber-200/70",
    },
    {
      id: "wheelchair-seva",
      titleKey: "safeguards.wheelchair.title",
      descriptionKey: "safeguards.wheelchair.description",
      icon: <Accessibility className="w-5 h-5 text-emerald-600" />,
      bg: "bg-[#F0FDF4] border-emerald-200/70",
    },
    {
      id: "concierge",
      titleKey: "safeguards.concierge.title",
      descriptionKey: "safeguards.concierge.description",
      icon: <Headphones className="w-5 h-5 text-blue-600" />,
      bg: "bg-[#EFF6FF] border-blue-200/70",
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
          {t("safeguards.eyebrow")}
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
          {t("safeguards.title")}
        </h2>
      </div>

      {/* 4 Safeguard Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {safeguards.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border p-5 transition-transform hover:-translate-y-1 ${item.bg}`}
          >
            <div className="w-10 h-10 rounded-xl bg-white shadow-2xs flex items-center justify-center mb-3">
              {item.icon}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1.5">
              {t(item.titleKey)}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t(item.descriptionKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}