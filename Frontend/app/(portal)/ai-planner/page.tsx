"use client";

import React, { useState } from "react";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalFooter from "@/components/portal/PortalFooter";
import {
  Sparkles,
  Calendar,
  Users,
  Moon,
  Sun,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { usePreferences } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/en";
import { formatApiError } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const durations = ["1 Day", "2 Days", "3 Days", "5 Days", "7+ Days"];

/**
 * These are the canonical English values the backend's `DevoteeType` enum
 * expects — they are sent verbatim in the API payload, so they must NOT be
 * translated here. Translate only for display via `devoteeLabel`.
 */
const DEVOTEE_KEYS: Record<string, TranslationKey> = {
  "General Devotee": "devotee.general",
  "Senior Citizen (60+)": "devotee.senior",
  "Family with Kids": "devotee.family",
  "Overseas / NRI": "devotee.nri",
  "First Time Visitor": "devotee.firstTime",
};
const devoteeTypes = Object.keys(DEVOTEE_KEYS);

interface ItineraryItem {
  day: string;
  time: string;
  activity: string;
  type: string;
  color: string;
  description?: string;
}

interface GeneratedItinerary {
  id: number | null;
  title: string;
  itinerary_data: ItineraryItem[];
}

export default function AIPlannerPage() {
  const { t } = usePreferences();
  const [selectedDuration, setSelectedDuration] = useState("2 Days");
  // Canonical English enum value — this is what gets sent to the API.
  const [selectedType, setSelectedType] = useState("General Devotee");
  const [includeStays, setIncludeStays] = useState(true);
  const [includeMeals, setIncludeMeals] = useState(true);
  const [includeTransport, setIncludeTransport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [error, setError] = useState("");
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [saveMessage, setSaveMessage] = useState("");

  const handleGenerate = async () => {
    setError("");
    setSaveMessage("");
    setIsGenerating(true);
    setIsGenerated(false);

    try {
      const token = localStorage.getItem("shirdi_access_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/itinerary/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          duration: selectedDuration,
          devotee_type: selectedType,
          include_stays: includeStays,
          include_meals: includeMeals,
          include_transport: includeTransport,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(formatApiError(data, t("planner.generateFailed")));
        return;
      }

      if (!data || !Array.isArray(data.itinerary_data) || data.itinerary_data.length === 0) {
        setError(t("planner.emptyItinerary"));
        return;
      }

      setItinerary({
        id: data.id ?? null,
        title: data.title || `${selectedDuration} Pilgrimage — ${selectedType}`,
        itinerary_data: data.itinerary_data,
      });
      setIsGenerated(true);
    } catch {
      setError("Cannot connect to server. Please make sure the backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaveMessage("");
    if (!itinerary?.id) {
      setSaveMessage(t("planner.loginToSave"));
      return;
    }
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setSaveMessage(t("planner.loginToSave"));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/itinerary/save/${itinerary.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      setSaveMessage(
        res.ok
          ? t("planner.saved")
          : formatApiError(data, t("planner.saveFailed"))
      );
    } catch {
      setSaveMessage("Cannot reach the server. Please make sure the backend is running.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <PortalHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Page Header */}
        <div className="mb-10">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-[#C2410C]" />
            {t("planner.eyebrow")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight mb-2">
            {t("planner.title")}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            {t("planner.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Planner Configuration Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col gap-6">
              {/* {t("planner.duration")} */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#C2410C]" />
                  {t("planner.duration")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {durations.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDuration(d)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        selectedDuration === d
                          ? "bg-[#FEF9EE] border-[#C2410C] text-[#A73710] shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Devotee Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#C2410C]" />
                  {t("planner.devoteeType")}
                </label>
                <div className="flex flex-col gap-2">
                  {devoteeTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border text-left transition-all ${
                        selectedType === type
                          ? "bg-[#FEF9EE] border-[#C2410C] text-[#A73710] shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {t(DEVOTEE_KEYS[type])}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences with Toggle Switches */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-3 block">
                  {t("planner.includeInItinerary")}
                </label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-indigo-500" /> Accommodation & Stays
                    </span>
                    <ToggleSwitch enabled={includeStays} onChange={setIncludeStays} activeColor="bg-[#A73710]" />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-500" /> Meal & Prasadam Schedule
                    </span>
                    <ToggleSwitch enabled={includeMeals} onChange={setIncludeMeals} activeColor="bg-[#A73710]" />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-500" /> Transport & Cab Bookings
                    </span>
                    <ToggleSwitch enabled={includeTransport} onChange={setIncludeTransport} activeColor="bg-[#A73710]" />
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-md disabled:opacity-70"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("planner.crafting")}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t("planner.generate")}</span>
                  </>
                )}
              </button>

              {/* Backend Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Generated Itinerary */}
          <div className="lg:col-span-3">
            {!isGenerated && !isGenerating && (
              <div className="h-full min-h-[400px] bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-4 p-8">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#C2410C]" />
                </div>
                <h3 className="text-lg font-serif font-bold text-slate-800">{t("planner.awaits")}</h3>
                <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                  Configure your trip preferences on the left and click Generate to receive a personalised sacred pilgrimage schedule.
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="h-full min-h-[400px] bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center gap-4 p-8">
                <Loader2 className="w-10 h-10 text-[#A73710] animate-spin" />
                <p className="text-sm font-semibold text-slate-600">{t("planner.craftingHint")}</p>
              </div>
            )}

            {isGenerated && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Itinerary Header */}
                <div className="bg-gradient-to-r from-[#A73710] to-[#C2410C] px-5 py-4 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-amber-300" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-200">
                      SaiAI Generated Itinerary
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl">
                    {itinerary?.title || `${selectedDuration} Pilgrimage — ${selectedType}`}
                  </h3>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Personalised schedule with {includeStays ? "stays, " : ""}{includeMeals ? "meals, " : ""}{includeTransport ? "transport & " : ""}all sacred Aartis
                  </p>
                </div>

                {/* Timeline */}
                <div className="p-5 flex flex-col gap-3 max-h-[520px] overflow-y-auto">
                  {(itinerary?.itinerary_data || []).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3.5">
                      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#A73710] mt-1" />
                        {idx < (itinerary?.itinerary_data?.length || 0) - 1 && (
                          <div className="w-0.5 h-8 bg-slate-200 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            {item.day ? `${item.day} • ` : ""}{item.time}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.color}`}>
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">{item.activity}</p>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Button */}
                <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
                  {saveMessage && (
                    <p className="text-[11px] text-center text-emerald-700 font-semibold">{saveMessage}</p>
                  )}
                  <button
                    onClick={handleSave}
                    className="w-full bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Save to My Trips
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
