"use client";

/**
 * Razorpay Checkout integration.
 *
 * Loads the Razorpay web SDK on demand and opens the hosted checkout modal.
 * The returned promise resolves with the payment credentials only after the
 * user completes payment — the backend then verifies the signature before
 * confirming any booking.
 *
 * In mock mode (no real keys) the backend returns `mock: true` and we skip
 * the SDK entirely, resolving immediately so the local dev flow completes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

const SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpayOptions {
  order_id: string;
  amount: number; // INR
  currency: string;
  name: string;
  description: string;
  key_id: string;
  receipt: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let sdkPromise: Promise<void> | null = null;

/** Load the Razorpay SDK exactly once. */
function loadSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay SDK requires a browser."));
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the Razorpay SDK."));
    document.body.appendChild(script);
  });
  return sdkPromise;
}

/**
 * Open Razorpay Checkout and resolve when the payment succeeds.
 * Rejects if the user dismisses the modal or the payment fails.
 */
export async function openRazorpay(options: RazorpayOptions): Promise<RazorpaySuccess> {
  await loadSdk();

  return new Promise<RazorpaySuccess>((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error("Razorpay SDK is unavailable."));
      return;
    }

    const rzp = new window.Razorpay({
      key: options.key_id,
      amount: Math.round(options.amount * 100), // paise
      currency: options.currency,
      name: options.name,
      description: options.description,
      order_id: options.order_id,
      receipt: options.receipt,
      prefill: options.prefill || {},
      theme: { color: "#A73710" },
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled.")),
      },
      handler: (response: RazorpaySuccess) => {
        resolve({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        });
      },
    });

    rzp.open();
  });
}

/**
 * Small helper that runs the whole pay flow: open the modal, then verify
 * the result with the backend. Returns the verified result or throws.
 */
export async function payAndVerify(
  options: RazorpayOptions,
  verify: (payment: RazorpaySuccess) => Promise<unknown>
) {
  const payment = await openRazorpay(options);
  return verify(payment);
}

export function PaymentSpinner({ label = "Opening secure payment…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin text-[#A73710]" />
      <p className="text-xs font-semibold">{label}</p>
      <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        256-bit encrypted · powered by Razorpay
      </p>
    </div>
  );
}

/** Track whether the SDK has finished loading (for button states). */
export function useRazorpayReady() {
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    loadSdk()
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  return ready;
}
