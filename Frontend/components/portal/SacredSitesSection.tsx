"use client";

import React from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { usePreferences } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";

export default function SacredSitesSection() {
  const { t } = usePreferences();

  const sites: {
    id: string;
    titleKey: TranslationKey;
    badgeKey: TranslationKey;
    badgeColor: string;
    image: string;
    descriptionKey: TranslationKey;
  }[] = [
    {
      id: "dwarkamai",
      titleKey: "sites.dwarkamai.title",
      badgeKey: "sites.dwarkamai.badge",
      badgeColor: "bg-orange-500/90 text-white",
      image: "/dwarkamai.jpg",
      descriptionKey: "sites.dwarkamai.description",
    },
    {
      id: "samadhi-mandir",
      titleKey: "sites.samadhi.title",
      badgeKey: "sites.samadhi.badge",
      badgeColor: "bg-amber-500/90 text-white",
      image: "/samadhi-mandir.jpg",
      descriptionKey: "sites.samadhi.description",
    },
    {
      id: "chavadi",
      titleKey: "sites.chavadi.title",
      badgeKey: "sites.chavadi.badge",
      badgeColor: "bg-[#B45309]/90 text-white",
      image: "/chavadi.jpg",
      descriptionKey: "sites.chavadi.description",
    },
    {
      id: "lendi-baug",
      titleKey: "sites.lendi.title",
      badgeKey: "sites.lendi.badge",
      badgeColor: "bg-emerald-700/90 text-white",
      image: "/lendi-baug.jpg",
      descriptionKey: "sites.lendi.description",
    },
  ];

  return (
    <section
      id="sacred-sites"
      className="w-full bg-[#F6F8FB] border-y border-slate-200/80 py-14 sm:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
            {t("sites.eyebrow")}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">
            {t("sites.title")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            {t("sites.subtitle")}
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 group flex flex-col"
            >
              {/* Image Container */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                <Image
                  src={site.image}
                  alt={t(site.titleKey)}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {/* Badge Overlay */}
                <div className="absolute top-3 left-3">
                  <span
                    className={`text-[9px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1 ${site.badgeColor}`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{t(site.badgeKey)}</span>
                  </span>
                </div>
              </div>

              {/* Text Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-serif font-bold text-slate-900 group-hover:text-[#A73710] transition-colors mb-1.5">
                    {t(site.titleKey)}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t(site.descriptionKey)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}