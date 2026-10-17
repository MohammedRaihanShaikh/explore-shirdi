"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Ticket,
  Bed,
  Utensils,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  QrCode,
  LogIn,
} from "lucide-react";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalFooter from "@/components/portal/PortalFooter";
import {
  api,
  type DarshanPassResponse,
  type StayBookingResponse,
  type DiningBookingResponse,
  type UserProfile,
} from "@/lib/api";
import { usePreferences } from "@/lib/i18n";

type BookingTab = "all" | "darshan" | "stays" | "dining";

function readCachedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem("shirdi_user");
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export default function MyBookingsPage() {
  const { t, formatMoney, formatDate } = usePreferences();
  const [activeTab, setActiveTab] = useState<BookingTab>("all");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Booking states
  const [darshanPasses, setDarshanPasses] = useState<DarshanPassResponse[]>([]);
  const [stayBookings, setStayBookings] = useState<StayBookingResponse[]>([]);
  const [diningBookings, setDiningBookings] = useState<DiningBookingResponse[]>([]);

  const loadAllBookings = useCallback(async (authToken: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const [passesRes, staysRes, diningRes] = await Promise.allSettled([
        api.darshan.myPasses(authToken),
        api.stays.myBookings(authToken),
        api.dining.myBookings(authToken),
      ]);

      if (passesRes.status === "fulfilled") {
        setDarshanPasses(passesRes.value || []);
      }
      if (staysRes.status === "fulfilled") {
        setStayBookings(staysRes.value || []);
      }
      if (diningRes.status === "fulfilled") {
        setDiningBookings(diningRes.value || []);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load some of your bookings. Please refresh." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cachedToken = localStorage.getItem("shirdi_access_token");
    const cachedUser = readCachedUser();
    setToken(cachedToken);
    setUser(cachedUser);

    if (cachedToken) {
      loadAllBookings(cachedToken);
    } else {
      setLoading(false);
    }
  }, [loadAllBookings]);

  const handleCancelDarshan = async (passId: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to cancel this Darshan pass?")) return;
    setCancellingId(`darshan-${passId}`);
    try {
      await api.darshan.cancel(passId, token);
      setMessage({ type: "success", text: "Darshan pass cancelled successfully." });
      setDarshanPasses((prev) =>
        prev.map((p) => (p.id === passId ? { ...p, status: "cancelled" } : p))
      );
    } catch {
      setMessage({ type: "error", text: "Could not cancel pass. Please try again." });
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelStay = async (bookingId: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to cancel this accommodation booking?")) return;
    setCancellingId(`stay-${bookingId}`);
    try {
      await api.stays.cancel(bookingId, token);
      setMessage({ type: "success", text: "Stay booking cancelled successfully." });
      setStayBookings((prev) =>
        prev.map((s) => (s.id === bookingId ? { ...s, status: "cancelled" } : s))
      );
    } catch {
      setMessage({ type: "error", text: "Could not cancel stay booking. Please try again." });
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelDining = async (bookingId: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to cancel this dining reservation?")) return;
    setCancellingId(`dining-${bookingId}`);
    try {
      await api.dining.cancel(bookingId, token);
      setMessage({ type: "success", text: "Dining reservation cancelled successfully." });
      setDiningBookings((prev) =>
        prev.map((d) => (d.id === bookingId ? { ...d, status: "cancelled" } : d))
      );
    } catch {
      setMessage({ type: "error", text: "Could not cancel dining reservation." });
    } finally {
      setCancellingId(null);
    }
  };

  const totalBookingsCount =
    darshanPasses.length + stayBookings.length + diningBookings.length;

  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "confirmed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Confirmed
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3 text-red-600" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between text-slate-800">
      <PortalHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
              <Sparkles className="w-3.5 h-3.5 inline mr-1 text-[#C2410C]" />
              Pilgrim Account Vouchers
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight">
              My Pilgrimage Bookings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              All active Darshan passes, accommodation reservations, and Annachhatra dining vouchers for your sacred pilgrimage.
            </p>
          </div>

          {token && (
            <button
              type="button"
              onClick={() => loadAllBookings(token)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-amber-900/30 hover:text-[#A73710] shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#A73710]" : ""}`} />
              <span>Refresh Vouchers</span>
            </button>
          )}
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Not Logged In State */}
        {!token && (
          <div className="bg-white rounded-2xl border border-amber-900/10 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#A73710] flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-serif text-slate-900 mb-2">
              Sign In to View Your Bookings
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Sign in with your registered devotee email to access your passes, room vouchers, and live QR gate clearances.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold text-xs shadow-xs transition-colors"
            >
              <span>Sign In to Pilgrim Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {token && (
          <>
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "all"
                    ? "bg-[#A73710] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-amber-900/30 hover:text-[#A73710]"
                }`}
              >
                All Bookings ({totalBookingsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("darshan")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "darshan"
                    ? "bg-[#A73710] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-amber-900/30 hover:text-[#A73710]"
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Darshan Passes ({darshanPasses.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("stays")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "stays"
                    ? "bg-[#A73710] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-amber-900/30 hover:text-[#A73710]"
                }`}
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Stays &amp; Ashrams ({stayBookings.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dining")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "dining"
                    ? "bg-[#A73710] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-amber-900/30 hover:text-[#A73710]"
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Dining &amp; Prasadam ({diningBookings.length})</span>
              </button>
            </div>

            {loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#A73710]" />
                <span>Loading your pilgrimage vouchers...</span>
              </div>
            )}

            {!loading && totalBookingsCount === 0 && (
              <div className="bg-white rounded-2xl border border-amber-900/10 p-10 sm:p-14 text-center max-w-xl mx-auto shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#A73710] flex items-center justify-center mx-auto mb-3">
                  <Ticket className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-serif text-slate-900 mb-1">
                  No Bookings Found Yet
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  You haven&apos;t booked any Darshan passes, accommodation, or prasadam meals yet. Explore our temple services below:
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/darshan"
                    className="px-4 py-2 rounded-xl bg-[#A73710] text-white text-xs font-bold hover:bg-[#8F2E0C] transition-colors"
                  >
                    Book Darshan Pass
                  </Link>
                  <Link
                    href="/stays"
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:border-amber-900/30 hover:text-[#A73710] transition-colors"
                  >
                    Browse Stays
                  </Link>
                  <Link
                    href="/dining"
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:border-amber-900/30 hover:text-[#A73710] transition-colors"
                  >
                    Reserve Dining
                  </Link>
                </div>
              </div>
            )}

            {/* List of Bookings */}
            <div className="space-y-4">
              {/* Darshan Passes Section */}
              {(activeTab === "all" || activeTab === "darshan") &&
                darshanPasses.map((pass) => (
                  <div
                    key={`darshan-${pass.id}`}
                    className="bg-white rounded-2xl border border-amber-900/10 p-5 sm:p-6 shadow-xs hover:border-amber-900/25 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#A73710] flex items-center justify-center flex-shrink-0">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            Darshan Pass
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            Ref: {pass.booking_ref}
                          </span>
                          {renderStatusBadge(pass.status)}
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900">
                          {pass.pass_type.replace(/_/g, " ").toUpperCase()} DARSHAN PASS
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Visit: {formatDate(pass.visit_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {pass.num_devotees} Devotee{pass.num_devotees > 1 ? "s" : ""}
                          </span>
                          {pass.gate_number && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              Gate No. {pass.gate_number}
                            </span>
                          )}
                          <span className="font-semibold text-slate-700">
                            Amount: {pass.price_paid === 0 ? "Free" : formatMoney(pass.price_paid)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {pass.status.toLowerCase() !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => handleCancelDarshan(pass.id)}
                          disabled={cancellingId === `darshan-${pass.id}`}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {cancellingId === `darshan-${pass.id}` ? "Cancelling..." : "Cancel Pass"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {/* Stays Bookings Section */}
              {(activeTab === "all" || activeTab === "stays") &&
                stayBookings.map((stay) => (
                  <div
                    key={`stay-${stay.id}`}
                    className="bg-white rounded-2xl border border-amber-900/10 p-5 sm:p-6 shadow-xs hover:border-amber-900/25 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                        <Bed className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                            Accommodation Voucher
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            Ref: {stay.booking_ref}
                          </span>
                          {renderStatusBadge(stay.status)}
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900">
                          {stay.stay_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(stay.check_in)} → {formatDate(stay.check_out)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {stay.num_guests} Guests ({stay.num_rooms} Room{stay.num_rooms > 1 ? "s" : ""})
                          </span>
                          <span className="font-bold text-slate-800">
                            Total: {formatMoney(stay.total_price)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {stay.status.toLowerCase() !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => handleCancelStay(stay.id)}
                          disabled={cancellingId === `stay-${stay.id}`}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {cancellingId === `stay-${stay.id}` ? "Cancelling..." : "Cancel Booking"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {/* Dining Bookings Section */}
              {(activeTab === "all" || activeTab === "dining") &&
                diningBookings.map((dining) => (
                  <div
                    key={`dining-${dining.id}`}
                    className="bg-white rounded-2xl border border-amber-900/10 p-5 sm:p-6 shadow-xs hover:border-amber-900/25 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-yellow-50 text-amber-800 flex items-center justify-center flex-shrink-0">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-900">
                            Prasadam Dining
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            Ref: {dining.booking_ref}
                          </span>
                          {renderStatusBadge(dining.status)}
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900">
                          {dining.hall_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Meal Date: {formatDate(dining.meal_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Slot: {dining.time_slot}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {dining.num_devotees} Devotees
                          </span>
                          <span className="font-bold text-slate-800">
                            {dining.total_price === 0 ? "Free Prasadalaya" : formatMoney(dining.total_price)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {dining.status.toLowerCase() !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => handleCancelDining(dining.id)}
                          disabled={cancellingId === `dining-${dining.id}`}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {cancellingId === `dining-${dining.id}` ? "Cancelling..." : "Cancel Reservation"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </main>

      <PortalFooter />
    </div>
  );
}
