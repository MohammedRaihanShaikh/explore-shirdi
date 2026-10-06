"use client";

import React from "react";
import Link from "next/link";
import {
  Ticket,
  Bed,
  Sparkles,
  Utensils,
  Radio,
  Compass,
  ArrowRight,
} from "lucide-react";
import { usePreferences } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";

export default function ServicesSection() {
  const { t } = usePreferences();

  const services: {
    id: string;
    titleKey: TranslationKey;
    tagKey: TranslationKey;
    descriptionKey: TranslationKey;
    footerKey: TranslationKey;
    tagColor: string;
    icon: React.ReactNode;
    iconBg: string;
  }[] = [
    {
      id: "vip-darshan",
      titleKey: "services.vip.title",
      tagKey: "services.vip.tag",
      descriptionKey: "services.vip.description",
      footerKey: "services.vip.footer",
      tagColor: "bg-amber-100 text-amber-900 border-amber-200",
      icon: <Ticket className="w-5 h-5 text-[#C2410C]" />,
      iconBg: "bg-[#FFEDD5]",
    },
    {
      id: "sanctuary-stays",
      titleKey: "services.stays.title",
      tagKey: "services.stays.tag",
      descriptionKey: "services.stays.description",
      footerKey: "services.stays.footer",
      tagColor: "bg-blue-100 text-blue-900 border-blue-200",
      icon: <Bed className="w-5 h-5 text-amber-800" />,
      iconBg: "bg-[#FEF9C3]",
    },
    {
      id: "sai-ai",
      titleKey: "services.ai.title",
      tagKey: "services.ai.tag",
      descriptionKey: "services.ai.description",
      footerKey: "services.ai.footer",
      tagColor: "bg-orange-100 text-orange-900 border-orange-200",
      icon: <Sparkles className="w-5 h-5 text-[#EA580C]" />,
      iconBg: "bg-[#FFEDD5]",
    },
    {
      id: "prasadam",
      titleKey: "services.prasadam.title",
      tagKey: "services.prasadam.tag",
      descriptionKey: "services.prasadam.description",
      footerKey: "services.prasadam.footer",
      tagColor: "bg-yellow-100 text-yellow-900 border-yellow-200",
      icon: <Utensils className="w-5 h-5 text-amber-800" />,
      iconBg: "bg-[#FEF08A]",
    },
    {
      id: "live-aarti",
      titleKey: "services.live.title",
      tagKey: "services.live.tag",
      descriptionKey: "services.live.description",
      footerKey: "services.live.footer",
      tagColor: "bg-red-100 text-red-900 border-red-200",
      icon: <Radio className="w-5 h-5 text-rose-700" />,
      iconBg: "bg-rose-100",
    },
    {
      id: "excursions",
      titleKey: "services.excursions.title",
      tagKey: "services.excursions.tag",
      descriptionKey: "services.excursions.description",
      footerKey: "services.excursions.footer",
      tagColor: "bg-indigo-100 text-indigo-900 border-indigo-200",
      icon: <Compass className="w-5 h-5 text-indigo-700" />,
      iconBg: "bg-indigo-100",
    },
  ];

  return (
    <section id="services" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
            {t("services.eyebrow")}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
            {t("services.title")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1.5 leading-relaxed">
            {t("services.subtitle")}
          </p>
        </div>

        <Link
          href="/attractions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A73710] hover:text-[#7C2D12] transition-colors whitespace-nowrap group"
        >
          <span>{t("services.exploreAll")}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Services Grid (3x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {services.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group hover:border-[#E8B896]"
          >
            <div>
              {/* Icon & Badge */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-xl ${item.iconBg} flex items-center justify-center shadow-2xs`}
                >
                  {item.icon}
                </div>
              </div>

              {/* Tag */}
              <span
                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.tagColor} mb-2 uppercase tracking-wide`}
              >
                {t(item.tagKey)}
              </span>

              {/* Title & Description */}
              <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900 mb-2 group-hover:text-[#A73710] transition-colors">
                {t(item.titleKey)}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                {t(item.descriptionKey)}
              </p>
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 group-hover:text-[#A73710] transition-colors">
                {t(item.footerKey)}
              </span>
              <div className="w-6 h-6 rounded-full bg-slate-50 group-hover:bg-[#FDECE4] text-slate-400 group-hover:text-[#A73710] flex items-center justify-center transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}