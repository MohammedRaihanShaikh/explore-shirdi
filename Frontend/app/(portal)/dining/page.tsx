"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Metadata } from "next";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalFooter from "@/components/portal/PortalFooter";
import { Utensils, Clock, ArrowRight, ShieldCheck, Leaf, CheckCircle2, X, Loader2, AlertCircle, Bed, Users, CalendarDays } from "lucide-react";
import Link from "next/link";
import { formatApiError } from "@/lib/api";
import UpiQrModal from "@/components/pay/UpiQrModal";
import { usePreferences } from "@/lib/i18n";
import type { PaymentOrder } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const diningOptions = [
  {
    id: "sansthan-prasadalaya",
    title: "Shri Sai Baba Sansthan Prasadalaya",
    category: "Official Sansthan Kitchen",
    categoryColor: "bg-amber-100 text-amber-900 border-amber-200",
    description: "Asia's largest solar-powered community kitchen serving over 50,000 pilgrims daily. Pure satvik meals at zero cost for general devotees. Book a sponsored meal tray for merit.",
    price: "Free / Donation",
    timings: "6:00 AM – 10:00 PM",
    serves: "50,000+ daily",
    highlight: true,
    tags: ["Satvik Only", "Solar Powered", "Sansthan Certified"],
    isFree: true,
  },
  {
    id: "prasad-laddu",
    title: "Sansthan Sacred Laddu Prasad",
    category: "Temple Prasad Counter",
    categoryColor: "bg-orange-100 text-orange-900 border-orange-200",
    description: "Book the official Sai Baba laddu prasad in advance. Available in 250g, 500g and 1kg boxes with Sansthan seal. Home delivery pan-India.",
    price: "₹55 – ₹220 / box",
    timings: "7:00 AM – 9:00 PM",
    serves: "Available at Gate 2",
    highlight: false,
    tags: ["Pre-Order Available", "Home Delivery", "Official Seal"],
    isFree: false,
  },
  {
    id: "maharashtrian-thali",
    title: "Gupte's Maharashtrian Bhojanalaya",
    category: "Traditional Dining",
    categoryColor: "bg-emerald-100 text-emerald-900 border-emerald-200",
    description: "Authentic Maharashtrian thali with jowar bhakri, zunka, pithla, and fresh sugarcane juice. Located 200m from Dwarkamai. Family-run since 1965.",
    price: "₹120 / thali",
    timings: "11:00 AM – 3:00 PM, 7:00 PM – 10:00 PM",
    serves: "300 covers daily",
    highlight: false,
    tags: ["No Onion No Garlic", "Traditional Recipe", "Family Run"],
    isFree: false,
  },
  {
    id: "sai-veg-restaurant",
    title: "Sai Arogya Pure Veg Restaurant",
    category: "Premium Satvik Dining",
    categoryColor: "bg-blue-100 text-blue-900 border-blue-200",
    description: "Upscale satvik multi-cuisine restaurant with South Indian, Gujarati and North Indian options. Air-conditioned, ideal for family pilgrimages.",
    price: "₹200 – ₹600",
    timings: "7:00 AM – 11:00 PM",
    serves: "A/C Seating for 120",
    highlight: false,
    tags: ["AC Restaurant", "Multi-Cuisine", "Family Friendly"],
    isFree: false,
  },
];

type DiningOption = typeof diningOptions[0];

interface BookingForm {
  guests: number;
}

export default function DiningPage() {
  const { t, formatMoney } = usePreferences();
  const [selectedOption, setSelectedOption] = useState<DiningOption | null>(null);
  const [form, setForm] = useState<BookingForm>({ guests: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<{ ref: string; total: number } | null>(null);
  const [error, setError] = useState("");
  const [payOrder, setPayOrder] = useState<{
    booking: { id: string; title: string; total_price: number; booking_ref: string };
    payment: PaymentOrder;
  } | null>(null);

  const [bookings, setBookings] = useState<{ id: string; title: string }[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const openModal = (option: DiningOption) => {
    setSelectedOption(option);
    setForm({ guests: 1 });
    setError("");
    setSuccess(null);
  };

  const closeModal = () => {
    setSelectedOption(null);
    setSuccess(null);
    setError("");
  };

  const handleBook = async () => {
    setError("");
    if (!selectedOption) { setError("Please select a dining option first."); return; }
    if (form.guests < 1 || form.guests > 10) { setError("Guests must be between 1 and 10."); return; }

    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setError("You must be logged in to book. Please sign in first.");
      return;
    }

    setIsLoading(true);
    try {
      // Parse price from display string
      let total = 0;
      if (!selectedOption.isFree) {
        const priceMatch = selectedOption.price.match(/₹(\d+)/);
        const unitPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
        total = unitPrice * form.guests;
      }

      // For free items, just confirm without payment
      if (selectedOption.isFree || total === 0) {
        setSuccess({ ref: `PRASAD-${Date.now()}`, total: 0 });
        return;
      }

      const payload = {
        dining_id: selectedOption.id,
        dining_name: selectedOption.title,
        num_guests: form.guests,
        total_price: total,
        special_requests: null,
      };

      const res = await fetch(`${API_BASE}/dining/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401) setError("Session expired. Please log in again.");
        else setError(formatApiError(data, "Booking failed. Please try again."));
        return;
      }

      // The booking is created PENDING. Open the UPI QR payment modal.
      const booking = data.booking;
      const payment = data.payment;

      if (payment.order_id || payment.upi_intent) {
        setPayOrder({ booking, payment });
        return;
      }

      // Fallback (should not happen): confirm directly.
      setSuccess({ ref: booking.booking_ref, total: booking.total_price });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("cancelled")) {
        setError("Payment was cancelled. Your booking was not confirmed.");
      } else {
        setError("Cannot connect to server. Please make sure the backend is running.");
      }
    } finally {
      setIsLoading(false);
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
        entity_type: "dining",
        entity_id: payOrder.booking.id,
        utr,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(formatApiError(data, "Verification failed."));
    }

    setSuccess({ ref: payOrder.booking.booking_ref, total: payOrder.booking.total_price });
    return data.message as string;
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <PortalHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Page Header */}
        <div className="mb-10">
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
            <Utensils className="w-3.5 h-3.5 inline mr-1 text-[#C2410C]" />
            {t("dining.eyebrow")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight mb-2">
            {t("dining.title")}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
            {t("dining.subtitle")}
          </p>
        </div>

        {/* Dining Cards */}
        <div className="flex flex-col gap-5 sm:gap-6">
          {diningOptions.map((option) => (
            <div
              key={option.id}
              className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all duration-300 p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-5 ${
                option.highlight ? "border-[#C2410C]/30 bg-[#FEF9EE]" : "border-slate-200/80"
              }`}
            >
              {/* Icon Block */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${option.highlight ? "bg-[#FFEDD5]" : "bg-slate-50 border border-slate-200"}`}>
                {option.highlight ? (
                  <Utensils className="w-6 h-6 text-[#C2410C]" />
                ) : (
                  <Leaf className="w-6 h-6 text-emerald-600" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${option.categoryColor}`}>
                    {option.category}
                  </span>
                  {option.highlight && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#A73710] text-white">
                      ⭐ Most Recommended
                    </span>
                  )}
                  {option.isFree && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border-emerald-200 border">
                      Free
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-serif font-bold text-slate-900 mb-1.5">{option.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{option.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {option.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#A73710]" />
                    {option.timings}
                  </span>
                  <span className="flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-slate-400" />
                    {option.serves}
                  </span>
                  <span className="font-bold text-[#A73710] text-sm ml-auto">
                    {option.price}
                  </span>
                  <button
                    onClick={() => openModal(option)}
                    className="flex items-center gap-1 font-bold text-[#A73710] hover:underline"
                  >
                    {t("dining.bookSlot")} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <PortalFooter />

      {/* Booking Modal */}
      {selectedOption && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-serif font-bold text-slate-900">{selectedOption.title}</h2>
                  <p className="text-xs text-slate-500">{selectedOption.category}</p>
                  {selectedOption.isFree && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Free / No Charge
                    </span>
                  )}
                </div>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success State */}
              {success ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{t("dining.bookingConfirmed")}</h3>
                  <p className="text-sm text-slate-600 mb-3">{t("dining.bookingConfirmedHint")}</p>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left mb-4">
                    <p className="text-xs font-bold text-emerald-800 mb-1">{t("stays.bookingRef")}</p>
                    <p className="text-lg font-bold text-emerald-700 font-mono">{success.ref}</p>
                    {success.total > 0 && (
                      <p className="text-xs text-emerald-600 mt-2">{t("stays.totalPaid", { amount: formatMoney(success.total) })}</p>
                    )}
                    {success.total === 0 && (
                      <p className="text-xs text-emerald-600 mt-2">{t("dining.freeNote")}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{t("dining.saveRef")}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-white hover:bg-amber-50 text-[#A73710] font-bold py-2.5 rounded-xl text-sm border border-[#E7D6A7] transition-colors"
                    >
                      {t("stays.viewBookings")}
                    </button>
                    <button onClick={closeModal} className="flex-1 bg-[#A73710] text-white font-bold py-2.5 rounded-xl text-sm">
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}

                  {/* Guests Field */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <Users className="w-3 h-3 inline mr-1" />{t("dining.guests")}
                    </label>
                    <input
                      type="number"
                      min={1} max={10}
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) || 1 })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30"
                    />
                  </div>

                  {/* Price Summary */}
                  {!selectedOption.isFree && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                      <div className="flex justify-between text-xs text-amber-900 mb-1">
                        <span>{formatMoney(parseInt(selectedOption.price.match(/₹(\d+)/)?.[1] || "0"))} x {form.guests} guest{form.guests > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-900">{t("dining.totalAmount")}</span>
                        <span className="text-lg font-bold text-[#A73710]">
                          {formatMoney(parseInt(selectedOption.price.match(/₹(\d+)/)?.[1] || "0") * form.guests)}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedOption.isFree && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-center">
                      <p className="text-sm font-bold text-emerald-800">{t("dining.isFree")}</p>
                      <p className="text-xs text-emerald-600 mt-1">{t("dining.freeNoteHint")}</p>
                    </div>
                  )}

                  {/* Confirm Button */}
                  <button
                    onClick={handleBook}
                    disabled={isLoading}
                    className="w-full bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>{t("dining.confirming")}</span></>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /><span>{selectedOption.isFree ? t("dining.confirmFree") : t("dining.confirmPay")}</span></>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center mt-2">{t("dining.secureNote")}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPI QR Payment Modal */}
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