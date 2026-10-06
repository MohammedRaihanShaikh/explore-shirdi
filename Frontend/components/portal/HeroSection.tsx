"use client";

import React, { useEffect, useState } from "react";
import { Clock, Flame, CloudSun, Sparkles, Loader2 } from "lucide-react";
import { usePreferences } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface QueueInfo {
  gate_number: number;
  wait_time_minutes: number;
  queue_length: number;
  status_label: string;
}

interface AartiInfo {
  name: string;
  time: string;
  time_24h: string;
}

interface WeatherInfo {
  temperature_c: number;
  description: string;
}

interface LiveDashboard {
  queues: QueueInfo[];
  next_aarti: AartiInfo | null;
  weather: WeatherInfo | null;
}

export default function HeroSection() {
  const { t } = usePreferences();
  const [live, setLive] = useState<LiveDashboard | null>(null);
  const [liveState, setLiveState] = useState<"loading" | "ready" | "offline">("loading");

  // Load real live status from the backend (queue / aarti / weather)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/live/dashboard`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as LiveDashboard;
        if (cancelled) return;
        setLive(data);
        setLiveState("ready");
      } catch {
        if (!cancelled) setLiveState("offline");
      }
    };

    load();
    const id = setInterval(load, 60_000); // refresh every minute
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Shortest waiting gate
  const bestGate = live?.queues?.length
    ? [...live.queues].sort((a, b) => a.wait_time_minutes - b.wait_time_minutes)[0]
    : null;

  const queueText =
    liveState === "loading"
      ? t("hero.loadingLive")
      : bestGate
        ? t("hero.gateStatus", {
            gate: bestGate.gate_number,
            minutes: bestGate.wait_time_minutes,
            status: bestGate.status_label,
          })
        : t("hero.queueUnavailable");

  const aartiText =
    liveState === "loading"
      ? t("hero.loadingLive")
      : live?.next_aarti
        ? `${live.next_aarti.name} • ${live.next_aarti.time_24h} IST`
        : t("hero.aartiUnavailable");

  const weatherText =
    liveState === "loading"
      ? t("hero.loadingLive")
      : live?.weather
        ? `${Math.round(live.weather.temperature_c)}°C ${live.weather.description}`
        : t("hero.weatherUnavailable");

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#FDFBF7] via-[#F1F5FB] to-[#F8F9FC] pt-12 sm:pt-16 md:pt-20 pb-14 sm:pb-18">
      {/* Background Sacred Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-amber-200/25 via-orange-100/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* Official Devotee Assistance Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/80 text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase mb-5 sm:mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
          <span>{t("hero.badge")}</span>
        </div>

        {/* Main Heading */}
        <h1 className="max-w-4xl font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.15] mb-4 sm:mb-5">
          {t("hero.titleLead")}{" "}
          <span className="italic text-[#A73710] font-medium">{t("hero.titleHighlight")}</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed mb-8 sm:mb-12">
          {t("hero.subtitle")}
        </p>

        {/* Real-Time Live Sanctum Status Bar (3 Cards) — data from GET /api/live/dashboard */}
        <div className="w-full max-w-4xl bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/50 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
            {/* Status 1: Queue Wait */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-orange-100 text-[#C2410C] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("hero.queue")}
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1">
                  {liveState === "loading" && <Loader2 className="w-3 h-3 animate-spin text-[#C2410C]" />}
                  {queueText}
                </p>
              </div>
            </div>

            {/* Status 2: Next Sacred Aarti */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-[#B45309] flex items-center justify-center flex-shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("hero.nextAarti")}
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1">
                  {liveState === "loading" && <Loader2 className="w-3 h-3 animate-spin text-[#B45309]" />}
                  {aartiText}
                </p>
              </div>
            </div>

            {/* Status 3: Shirdi Climate */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                <CloudSun className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t("hero.climate")}
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1">
                  {liveState === "loading" && <Loader2 className="w-3 h-3 animate-spin text-sky-700" />}
                  {weatherText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
