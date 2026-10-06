"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Flame,
  Clock,
  Play,
  Calendar,
  ArrowRight,
  Bell,
  Users,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
} from "lucide-react";
import { formatApiError } from "@/lib/api";
import UpiQrModal from "@/components/pay/UpiQrModal";
import type { PaymentOrder } from "@/lib/api";
import { usePreferences } from "@/lib/i18n";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const aartis = [
  { name: "Kakad Aarti", time: "04:30 AM", description: "Dawn awakening Aarti — the most spiritually potent. Baba is symbolically woken up with bells and conch.", color: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
  { name: "Madhyan Aarti", time: "12:00 PM", description: "Midday Aarti performed after the Naivedyam (sacred food offering) ritual at noon.", color: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  { name: "Dhoop Aarti", time: "Sunset (~06:15 PM)", description: "Evening incense Aarti — the most attended. A spectacular multi-lamp ceremony at golden hour.", color: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  { name: "Shej Aarti", time: "10:00 PM", description: "Night Aarti — symbolic bedtime ritual. Baba is reverently put to rest with hymns and campher light.", color: "bg-slate-100 text-slate-800", dot: "bg-slate-500" },
];

const passes = [
  { pass_type: "general", title: "General Darshan", price: "Free", priceValue: 0, duration: "05:15 AM – 11:30 PM", tag: "Open Access", tagColor: "bg-emerald-100 text-emerald-800 border-emerald-200", highlight: false },
  { pass_type: "vip", title: "VIP Priority Darshan", price: "₹200 (Subsidised)", priceValue: 200, duration: "All Hours", tag: "Zero Wait Queue", tagColor: "bg-amber-100 text-amber-800 border-amber-200", highlight: true },
  { pass_type: "senior_wheelchair", title: "Senior / Wheelchair Pass", price: "Free", priceValue: 0, duration: "All Hours", tag: "Dedicated Lane", tagColor: "bg-blue-100 text-blue-800 border-blue-200", highlight: false },
  { pass_type: "abhishek_puja", title: "Abhishek Puja Slot", price: "₹500 Onwards", priceValue: 500, duration: "By Booking", tag: "Sansthan Official", tagColor: "bg-orange-100 text-orange-800 border-orange-200", highlight: false },
] as const;

type Pass = (typeof passes)[number];

interface DarshanPass {
  id: number;
  pass_type: string;
  visit_date: string;
  num_devotees: number;
  status: string;
  booking_ref: string;
  price_paid: number;
  gate_number?: number | null;
  created_at: string;
}

interface Reminder {
  id: number;
  aarti_name: string;
  remind_minutes_before: number;
  via_whatsapp: boolean;
  via_sms: boolean;
  is_active: boolean;
}

export default function DarshanContent() {
  const { t, formatMoney, formatDate } = usePreferences();
  const today = new Date().toISOString().split("T")[0];

  // Booking modal state
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [visitDate, setVisitDate] = useState("");
  const [numDevotees, setNumDevotees] = useState(1);
  const [gate, setGate] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<DarshanPass | null>(null);
  // UPI QR payment sheet — holds the pending paid pass awaiting payment.
  const [payOrder, setPayOrder] = useState<{
    pass: DarshanPass;
    payment: PaymentOrder;
  } | null>(null);

  // My passes
  const [myPasses, setMyPasses] = useState<DarshanPass[]>([]);
  const [passesLoading, setPassesLoading] = useState(false);
  const [passesError, setPassesError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Reminders
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderAarti, setReminderAarti] = useState("Kakad Aarti");
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loadPasses = useCallback(async () => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setIsLoggedIn(false);
      setMyPasses([]);
      return;
    }
    setIsLoggedIn(true);
    setPassesLoading(true);
    setPassesError("");
    try {
      const res = await fetch(`${API_BASE}/darshan/my-passes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setPassesError("Your session has expired. Please log in again.");
        setMyPasses([]);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMyPasses([]);
        setPassesError(formatApiError(data, "Could not load your darshan passes."));
        return;
      }
      setMyPasses(Array.isArray(data) ? data : []);
    } catch {
      setMyPasses([]);
      setPassesError("Cannot reach the server. Please make sure the backend is running.");
    } finally {
      setPassesLoading(false);
    }
  }, []);

  const loadReminders = useCallback(async () => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setReminders([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/reminders/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setReminders(Array.isArray(data) ? data : []);
    } catch {
      /* backend offline — ignore, reminders panel degrades gracefully */
    }
  }, []);

  useEffect(() => {
    loadPasses();
    loadReminders();
    const refresh = () => {
      loadPasses();
      loadReminders();
    };
    window.addEventListener("shirdi_auth_change", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("shirdi_auth_change", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadPasses, loadReminders]);

  const openBooking = (pass: Pass) => {
    setSelectedPass(pass);
    setVisitDate("");
    setNumDevotees(1);
    setGate("");
    setBookingError("");
    setBookingSuccess(null);
  };

  const closeBooking = () => {
    setSelectedPass(null);
    setBookingSuccess(null);
    setBookingError("");
  };

  const validateBooking = (): string => {
    if (!visitDate) return "Please choose a visit date.";
    if (visitDate < today) return "Visit date cannot be in the past.";
    if (!Number.isInteger(numDevotees) || numDevotees < 1 || numDevotees > 10)
      return "Number of devotees must be between 1 and 10.";
    if (gate && !["1", "2", "3"].includes(gate)) return "Gate must be 1, 2 or 3.";
    return "";
  };

  const handleBook = async () => {
    setBookingError("");
    const validationError = validateBooking();
    if (validationError) {
      setBookingError(validationError);
      return;
    }

    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setBookingError("You must be logged in to book a darshan pass. Please sign in first.");
      return;
    }

    setIsBooking(true);
    try {
      const payload = {
        pass_type: selectedPass!.pass_type,
        visit_date: new Date(`${visitDate}T06:00:00.000Z`).toISOString(),
        num_devotees: numDevotees,
        ...(gate ? { gate_number: Number(gate) } : {}),
      };
      const res = await fetch(`${API_BASE}/darshan/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 401) setBookingError("Session expired. Please log in again.");
        else setBookingError(formatApiError(data, "Booking failed. Please try again."));
        return;
      }

      const pass = data.pass;
      const payment = data.payment;

      // Free pass types (general, senior/wheelchair) are confirmed
      // immediately — no payment needed.
      if (!payment.order_id) {
        setBookingSuccess(data);
        await loadPasses();
        return;
      }

      // Paid pass — open the UPI QR payment sheet. The booking stays
      // PENDING until the pilgrim pays and the UTR is verified.
      setPayOrder({ pass, payment });
    } catch {
      setBookingError("Cannot connect to server. Please make sure the backend is running.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleUpiVerified = async (utr: string): Promise<string> => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token || !payOrder) throw new Error("Session expired.");

    const res = await fetch(`${API_BASE}/payments/verify-upi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        entity_type: "darshan",
        entity_id: payOrder.pass.id,
        utr,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(formatApiError(data, "Verification failed."));
    }

    // Payment confirmed. Leave the sheet open on its "Payment Successful"
    // phase — the pilgrim dismisses it with the Done button (onClose),
    // which is when the booking confirmation behind it is revealed.
    setBookingSuccess(payOrder.pass);
    await loadPasses();
    return data.message as string;
  };

  const handleCancelPass = async (passId: number) => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setPassesError("Please log in to manage your passes.");
      return;
    }
    setCancellingId(passId);
    try {
      const res = await fetch(`${API_BASE}/darshan/${passId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPassesError(formatApiError(data, "Could not cancel the pass."));
        return;
      }
      await loadPasses();
    } catch {
      setPassesError("Cannot reach the server. Please make sure the backend is running.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleEnableReminder = async () => {
    setReminderMessage(null);
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setReminderMessage({ kind: "err", text: "Please log in to enable Aarti reminders." });
      return;
    }
    setReminderBusy(true);
    try {
      const res = await fetch(`${API_BASE}/reminders/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          aarti_name: reminderAarti,
          remind_minutes_before: 30,
          via_whatsapp: true,
          via_sms: false,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setReminderMessage({
          kind: "err",
          text: formatApiError(data, "Could not enable the reminder."),
        });
        return;
      }
      setReminderMessage({ kind: "ok", text: `Reminder enabled for ${reminderAarti} (30 min before).` });
      await loadReminders();
    } catch {
      setReminderMessage({ kind: "err", text: "Cannot reach the server. Please make sure the backend is running." });
    } finally {
      setReminderBusy(false);
    }
  };

  const handleDisableReminder = async (reminderId: number) => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/reminders/${reminderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await loadReminders();
    } catch {
      /* ignore */
    }
  };

  const statusStyles: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    completed: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Page Header */}
      <div className="mb-10">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
          <Flame className="w-3.5 h-3.5 inline mr-1 text-[#C2410C]" />
          {t("darshan.eyebrow")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight mb-2">
          {t("darshan.title")}
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
          {t("darshan.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Aarti Schedule */}
        <div>
          <h2 className="text-xl font-serif font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#C2410C]" />
            {t("darshan.schedule")}
          </h2>
          <div className="flex flex-col gap-4">
            {aartis.map((aarti) => (
              <div key={aarti.name} className={`rounded-xl p-4 border ${aarti.color} border-current/20 flex items-start gap-4`}>
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${aarti.dot}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-slate-900">{aarti.name}</h3>
                    <span className="text-xs font-semibold text-[#A73710] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {aarti.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{aarti.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Live Aarti Stream Banner */}
          <div className="mt-6 bg-gradient-to-br from-[#1e0a02] to-[#3b1505] text-white rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                <span className="text-[10px] font-bold tracking-widest uppercase text-red-300">{t("darshan.liveNow")}</span>
              </div>
              <h3 className="text-base font-serif font-bold text-white">{t("darshan.streamTitle")}</h3>
              <p className="text-xs text-amber-200/70 mt-0.5">{t("darshan.streamHint")}</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-xs py-2.5 px-5 rounded-xl transition-colors whitespace-nowrap shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {t("darshan.watchLive")}
            </Link>
          </div>

          {/* Aarti Reminders (real API) */}
          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-900">{t("darshan.remindersTitle")}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{t("darshan.remindersHint")}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={reminderAarti}
                onChange={(e) => setReminderAarti(e.target.value)}
                className="flex-1 border border-emerald-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {aartis.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} — {a.time}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleEnableReminder}
                disabled={reminderBusy}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {reminderBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {t("darshan.enable")}
              </button>
            </div>

            {reminderMessage && (
              <p className={`text-[11px] mt-2 font-semibold ${reminderMessage.kind === "ok" ? "text-emerald-700" : "text-red-600"}`}>
                {reminderMessage.text}
              </p>
            )}

            {reminders.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                {reminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between bg-white border border-emerald-100 rounded-lg px-3 py-1.5">
                    <span className="text-[11px] text-slate-700 font-semibold">
                      {r.aarti_name} · {r.remind_minutes_before} min before
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDisableReminder(r.id)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700"
                    >
                      Disable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Darshan Passes */}
        <div>
          <h2 className="text-xl font-serif font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#C2410C]" />
            {t("darshan.passBooking")}
          </h2>
          <div className="flex flex-col gap-4">
            {passes.map((pass) => (
              <div
                key={pass.pass_type}
                className={`rounded-xl p-5 border flex items-center justify-between gap-4 transition-all ${
                  pass.highlight
                    ? "bg-[#FEF9EE] border-[#C2410C]/30 shadow-md"
                    : "bg-white border-slate-200/80 shadow-xs hover:shadow-sm"
                }`}
              >
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${pass.tagColor} mb-1.5 block w-fit`}>
                    {pass.tag}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{pass.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {pass.duration}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-[#A73710]">{pass.price}</p>
                  <button
                    type="button"
                    onClick={() => openBooking(pass)}
                    className="mt-1.5 text-xs font-bold text-[#A73710] hover:underline flex items-center gap-0.5 ml-auto"
                  >
                    Book <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* My Darshan Passes (real API) */}
          <div className="mt-6 bg-white border border-slate-200/80 rounded-xl p-4" id="my-passes">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-[#C2410C]" />
                {t("darshan.myPasses")}
              </h3>
              <button
                type="button"
                onClick={loadPasses}
                disabled={passesLoading}
                className="text-[11px] font-bold text-[#A73710] hover:underline disabled:opacity-60"
              >
                {passesLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {passesError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-800 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <p>{passesError}</p>
              </div>
            )}

            {!isLoggedIn ? (
              <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">{t("darshan.signInPasses")}</p>
                <Link href="/login" className="text-xs font-bold text-[#A73710] hover:underline">
                  Sign In →
                </Link>
              </div>
            ) : passesLoading && myPasses.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#A73710]" /> Loading...
              </div>
            ) : myPasses.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                {t("darshan.noPassesHint")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {myPasses.map((p) => {
                  const canCancel = p.status === "confirmed" || p.status === "pending";
                  return (
                    <div key={p.id} className="border border-slate-100 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 capitalize">
                            {p.pass_type.replace(/_/g, " ")}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase ${statusStyles[p.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {new Date(p.visit_date).toLocaleDateString()} · {p.num_devotees} devotee{p.num_devotees > 1 ? "s" : ""}
                          {p.gate_number ? ` · Gate ${p.gate_number}` : ""} · {p.booking_ref}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-[#A73710]">
                          {p.price_paid > 0 ? formatMoney(p.price_paid) : t("darshan.free")}
                        </p>
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => handleCancelPass(p.id)}
                            disabled={cancellingId === p.id}
                            className="text-[11px] font-bold text-red-500 hover:text-red-700 disabled:opacity-60"
                          >
                            {cancellingId === p.id ? "Cancelling..." : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Booking Modal ─── */}
      {selectedPass && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeBooking}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-serif font-bold text-slate-900">{selectedPass.title}</h2>
                  <p className="text-xs text-slate-500">{selectedPass.duration}</p>
                </div>
                <button onClick={closeBooking} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bookingSuccess ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{t("darshan.bookingConfirmed")}</h3>
                  <p className="text-sm text-slate-600 mb-3">{t("darshan.noPassesHint")}</p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left mb-4">
                    <p className="text-xs font-bold text-emerald-800 mb-1">{t("stays.bookingRef")}</p>
                    <p className="text-lg font-bold text-emerald-700 font-mono">{bookingSuccess.booking_ref}</p>
                    <p className="text-xs text-emerald-600 mt-2">
                      Visit: {new Date(bookingSuccess.visit_date).toLocaleDateString()} · {bookingSuccess.num_devotees} devotee
                      {bookingSuccess.num_devotees > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {t("darshan.total")}: {bookingSuccess.price_paid > 0 ? formatMoney(bookingSuccess.price_paid) : t("darshan.free")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        closeBooking();
                        document.getElementById("my-passes")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="flex-1 bg-white hover:bg-amber-50 text-[#A73710] font-bold py-2.5 rounded-xl text-sm border border-[#E7D6A7]"
                    >
                      View My Passes
                    </button>
                    <button onClick={closeBooking} className="flex-1 bg-[#A73710] text-white font-bold py-2.5 rounded-xl text-sm">
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {bookingError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>{bookingError}</p>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />{t("darshan.visitDate")}
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <Users className="w-3 h-3 inline mr-1" />Devotees
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={numDevotees}
                        onChange={(e) => setNumDevotees(parseInt(e.target.value) || 0)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <ShieldCheck className="w-3 h-3 inline mr-1" />Preferred Gate (optional)
                      </label>
                      <select
                        value={gate}
                        onChange={(e) => setGate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                      >
                        <option value="">{t("darshan.gate")} — Any gate</option>
                        <option value="1">Gate 1</option>
                        <option value="2">Gate 2</option>
                        <option value="3">Gate 3</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-900">{t("darshan.total")}</span>
                    <span className="text-lg font-bold text-[#A73710]">
                      {selectedPass.priceValue > 0
                        ? formatMoney(selectedPass.priceValue * numDevotees)
                        : t("darshan.free")}
                    </span>
                  </div>

                  <button
                    onClick={handleBook}
                    disabled={isBooking}
                    className="w-full bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t("stays.confirming")}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t("darshan.confirmBooking")}</span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    You must be logged in to book. Your pass is saved to your account.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── UPI QR Payment Sheet ─── */}
      {payOrder && (
        <UpiQrModal
          open={!!payOrder}
          onClose={() => setPayOrder(null)}
          upiIntent={payOrder.payment.upi_intent}
          upiId={payOrder.payment.upi_id}
          amount={payOrder.payment.amount}
          receipt={payOrder.payment.receipt}
          onVerify={handleUpiVerified}
        />
      )}
    </div>
  );
}
