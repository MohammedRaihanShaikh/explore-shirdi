"use client";

/**
 * UPI QR payment modal.
 *
 * Flow (two steps, then a full-screen verification wheel):
 *   1. Scan    — shows the merchant's REAL QR image (`public/QR_code.jpeg`)
 *                which opens the merchant's UPI app (PhonePe) when scanned.
 *                Plus an "Open in PhonePe" button that deep-links into the
 *                pilgrim's UPI app with the amount pre-filled.
 *   2. UTR     — the pilgrim pastes the UTR from their payment app.
 *   3. Verify  — a circular wheel animation runs in the centre of the page.
 *   4. Success — "Payment Successful", then the booking is revealed.
 */
import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  AlertCircle,
  ShieldCheck,
  PartyPopper,
} from "lucide-react";

type Phase = "scan" | "utr" | "verifying" | "success" | "error";

/** Keep the wheel on screen long enough to actually be seen. */
const MIN_VERIFY_MS = 1900;

interface UpiQrModalProps {
  open: boolean;
  onClose: () => void;
  upiIntent?: string;
  upiId?: string;
  amount: number;
  receipt: string;
  /** Called with the UTR when the pilgrim confirms they paid. */
  onVerify: (utr: string) => Promise<string>;
}

/** Build a UPI intent URL for dynamic QR generation. */
function buildUpiIntent(upiId: string | undefined, amount: number, receipt: string, merchantName: string): string {
  if (!upiId) return "";
  const pa = encodeURIComponent(upiId);
  const pn = encodeURIComponent(merchantName);
  const am = amount.toFixed(2);
  const cu = "INR";
  const tn = encodeURIComponent(receipt);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}`;
}

export default function UpiQrModal({
  open,
  onClose,
  upiIntent,
  upiId,
  amount,
  receipt,
  onVerify,
}: UpiQrModalProps) {
  const [phase, setPhase] = useState<Phase>("scan");
  const [utr, setUtr] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Generate dynamic UPI intent URL for QR code
  const dynamicUpiIntent = useMemo(() => buildUpiIntent(upiId, amount, receipt, "Explore Shirdi"), [upiId, amount, receipt]);

  // Lock the page behind the sheet so only the payment flow scrolls.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape closes the sheet — but never halfway through a verification.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "verifying") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onClose]);

  if (!open) return null;

  const step = phase === "scan" ? 1 : phase === "utr" ? 2 : 0;
  const payable = `Rs.${amount.toLocaleString("en-IN")}`;

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(upiId ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // Deep-link into PhonePe / the pilgrim's default UPI app.
  const openUpiApp = () => {
    if (dynamicUpiIntent) window.location.href = dynamicUpiIntent;
  };

  const handleVerify = async () => {
    const cleaned = utr.trim();
    if (cleaned.length < 12) {
      setError("Enter the full UTR number from your payment app (12-22 characters).");
      return;
    }
    setError("");
    setPhase("verifying");

    const startedAt = Date.now();
    try {
      await onVerify(cleaned);
      // Hold the wheel briefly so the animation is actually visible.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_VERIFY_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_VERIFY_MS - elapsed));
      }
      setPhase("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
      setPhase("error");
    }
  };

  return (
    <>
      {/* ── VERIFYING: circular wheel centred over the whole website ── */}
      {phase === "verifying" && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
          role="status"
          aria-live="polite"
        >
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />

          <div className="relative flex flex-col items-center text-center">
            <div className="relative w-36 h-36">
              {/* Outer track + spinning arc */}
              <div className="absolute inset-0 rounded-full border-[7px] border-white/10" />
              <div className="absolute inset-0 rounded-full border-[7px] border-transparent border-t-amber-500 border-r-amber-500/70 animate-[shirdi-wheel_1.1s_linear_infinite]" />
              {/* Inner wheel, counter-rotating */}
              <div className="absolute inset-5 rounded-full border-[5px] border-white/10" />
              <div className="absolute inset-5 rounded-full border-[5px] border-transparent border-b-orange-700 border-l-orange-700/70 animate-[shirdi-wheel-rev_1.7s_linear_infinite]" />
              {/* Hub */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-14 h-14 rounded-full bg-[#A73710] ring-1 ring-white/25 shadow-lg shadow-black/40 flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-white animate-pulse" />
                </span>
              </div>
            </div>

            <p className="mt-7 text-lg font-serif font-bold text-white">Verifying your payment…</p>
            <p className="mt-1.5 text-xs text-white/70 max-w-[260px]">
              Confirming UTR <span className="font-mono text-amber-300">{utr}</span> with your bank.
              Please keep this screen open.
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Booking {receipt}
            </p>
          </div>
        </div>
      )}

      {/* ── PAYMENT SHEET ─────────────────────────────────────────── */}
      <div className="fixed inset-0 z-[80] overflow-y-auto">
        <div
          className="fixed inset-0 bg-slate-900/60"
          onClick={phase === "verifying" ? undefined : onClose}
          aria-hidden="true"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pay with UPI"
          className="relative min-h-full flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#A73710] via-[#C2410C] to-[#F59E0B] px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-serif font-bold text-white">Pay with UPI</h2>
                <p className="text-[11px] text-white/80">PhonePe · Google Pay · Paytm · BHIM</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={phase === "verifying"}
                className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step progress */}
            {step > 0 && (
              <div className="flex items-center gap-2 px-5 pt-4">
                <span className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-[#A73710]" : "bg-slate-200"}`} />
                <span className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-[#A73710]" : "bg-slate-200"}`} />
                <span className="text-[10px] font-bold text-slate-400 ml-1">Step {step} of 2</span>
              </div>
            )}

            {/* ── STEP 1: scan the real QR ─────────────────────────── */}
            {phase === "scan" && (
              <div className="px-5 py-5">
                <div className="text-center mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Amount payable
                  </p>
                  <p className="text-3xl font-serif font-black text-slate-900 tabular-nums">
                    {payable}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{receipt}</p>
                </div>

                {/* QR code — the merchant's real UPI QR image (public/QR_code.jpeg) */}
                <div className="mx-auto w-fit p-3 rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/QR_code.jpeg"
                    alt={`UPI QR code for Rs.${amount.toLocaleString("en-IN")} — scan with PhonePe, Google Pay or Paytm`}
                    width={196}
                    height={196}
                    className="w-[196px] h-[196px] object-contain"
                  />
                </div>

                <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-3">
                  <Smartphone className="w-3.5 h-3.5 text-[#A73710]" />
                  Scan with PhonePe, Google Pay or Paytm
                </p>

                {dynamicUpiIntent && (
                  <button
                    type="button"
                    onClick={openUpiApp}
                    className="w-full mt-3 px-4 py-2.5 rounded-xl bg-[#5F259F] hover:bg-[#4C1D80] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    Open in UPI App
                  </button>
                )}

                {/* UPI id with copy */}
                <div className="flex items-center justify-between gap-2 mt-3 rounded-xl bg-[#FCFAF6] border border-slate-200 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {upiId || "UPI id not configured"}
                  </span>
                  <button
                    type="button"
                    onClick={copyUpiId}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                    title="Copy UPI id"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPhase("utr")}
                  className="w-full mt-4 px-4 py-3 rounded-xl bg-[#A73710] hover:bg-[#8F2E0C] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  I Have Paid — Enter UTR <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── STEP 2: enter the UTR ────────────────────────────── */}
            {phase === "utr" && (
              <div className="px-5 py-5">
                <button
                  type="button"
                  onClick={() => setPhase("scan")}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#A73710] hover:text-[#7C2D12] mb-3"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Show QR again
                </button>

                <div className="text-center mb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Amount paid
                  </p>
                  <p className="text-3xl font-serif font-black text-slate-900 tabular-nums">
                    {payable}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{receipt}</p>
                </div>

                <label htmlFor="utr-input" className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Paid? Enter your UTR number
                </label>
                <input
                  id="utr-input"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. 312345678901"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A73710]/20 focus:border-[#A73710] transition font-mono tracking-wide"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Find it in your UPI app under transaction history as “UTR” or “Txn. Reference No.”.
                </p>

                {error && (
                  <p className="flex items-start gap-1.5 text-[11px] text-red-600 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleVerify}
                  className="w-full mt-4 px-4 py-3 rounded-xl bg-[#A73710] hover:bg-[#8F2E0C] text-white text-xs font-bold transition-colors"
                >
                  Verify Payment
                </button>

                <p className="text-[10px] text-slate-400 text-center mt-2">
                  Your booking is confirmed the moment the UTR checks out.
                </p>
              </div>
            )}

            {/* ── SUCCESS ──────────────────────────────────────────── */}
            {phase === "success" && (
              <div className="px-5 py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                  <PartyPopper className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="mt-4 text-base font-serif font-bold text-slate-900">Payment Successful</p>
                <p className="text-xs text-slate-500 mt-1">{payable} paid via UPI</p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">{receipt}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-[#A73710] hover:bg-[#8F2E0C] text-white text-xs font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            )}

            {/* ── ERROR ────────────────────────────────────────────── */}
            {phase === "error" && (
              <div className="px-5 py-10 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="mt-4 text-sm font-serif font-bold text-slate-900">Verification failed</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[260px]">{error}</p>
                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setPhase("utr");
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-[#A73710] text-white text-xs font-bold hover:bg-[#8F2E0C]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
