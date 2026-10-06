"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Phone,
  Loader2,
  AlertCircle,
} from "lucide-react";
import AuthInput from "./AuthInput";
import PasswordInput from "./PasswordInput";
import { formatApiError } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const DEVOTEE_TYPE_MAP: Record<string, string> = {
  general: "General Devotee",
  senior: "Senior Citizen (60+)",
  nri: "Overseas / NRI",
};

export default function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devoteeType, setDevoteeType] = useState("general");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const validate = (): string => {
    if (!fullName.trim() || fullName.trim().length < 2) return "Full name must be at least 2 characters.";
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (phone && !/^[+]?[0-9]{10,15}$/.test(phone.replace(/\s/g, ""))) return "Enter a valid phone number (10-15 digits).";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      return "Password must include at least one letter and one number.";
    if (!agreeTerms) return "Please agree to the Terms of Sanctum Access to continue.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        devotee_type: DEVOTEE_TYPE_MAP[devoteeType] || "General Devotee",
      };
      if (phone.trim()) payload.phone = phone.trim().replace(/\s/g, "");

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(formatApiError(data, "Registration failed. Please try again."));
        return;
      }

      // Store tokens and user info
      localStorage.setItem("shirdi_access_token", data.access_token);
      localStorage.setItem("shirdi_refresh_token", data.refresh_token);
      localStorage.setItem("shirdi_user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("shirdi_auth_change"));

      setIsSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch {
      setError("Cannot connect to server. Please make sure the backend is running at http://localhost:8000");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col justify-center px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-emerald-800 uppercase">
          New Pilgrim Registration
        </span>
      </div>

      <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
        Join Shirdi Pilgrim Portal
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5 leading-relaxed">
        Unlock priority darshan passes, Sansthan room sync, and curated spiritual stays.
      </p>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-xs">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Registration Failed</p>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {isSuccess && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold">Welcome, {fullName}! Account Created!</p>
            <p className="text-emerald-700">Redirecting you to your pilgrim dashboard...</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
        <AuthInput
          label="Devotee Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Tejas Ahire"
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AuthInput
            label="Mobile Number"
            badge="For Darshan SMS"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98230 45890"
            leftIcon={<Smartphone className="w-4 h-4" />}
          />
          <AuthInput
            label="Devotee Email"
            badge="For E-Pass & Login"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />
        </div>

        <PasswordInput
          label="Create Master Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          showStrengthMeter={true}
          required
        />

        <div className="flex flex-col gap-1.5 mt-1">
          <label className="text-xs font-semibold text-slate-700">Devotee Category</label>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              { id: "general", title: "General Devotee" },
              { id: "senior", title: "Senior (60+) / VIP" },
              { id: "nri", title: "Overseas / NRI" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setDevoteeType(cat.id)}
                className={`py-2 px-1 sm:px-2 text-center text-[10px] sm:text-xs font-medium rounded-xl border transition-all ${
                  devoteeType === cat.id
                    ? "bg-[#FEF9EE] border-[#C2410C] text-[#A73710] font-semibold shadow-2xs"
                    : "bg-[#F8FAFC] border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-[#A73710] focus:ring-[#A73710] border-slate-300 accent-[#A73710] flex-shrink-0"
            />
            <span className="leading-tight">
              I agree to the <Link href="#" className="underline text-slate-800">Terms of Sanctum Access</Link> &amp; <Link href="#" className="underline text-slate-800">VIP Darshan Guidelines</Link>.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || isSuccess}
          className="w-full bg-[#A73710] hover:bg-[#8F2E0C] active:bg-[#78260A] text-white font-semibold py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl shadow-md shadow-amber-900/15 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm mt-1 focus:outline-none focus:ring-4 focus:ring-amber-500/25 disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Your Pilgrim Account...</span>
            </>
          ) : (
            <>
              <span>Complete Sacred Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-600">
        Already have a pilgrim account?{" "}
        <Link href="/login" className="font-bold text-[#A73710] hover:text-[#7C2D12] hover:underline">
          Sign In Here
        </Link>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-[#A73710]" />
          <span>24/7 Shirdi Helpline:</span>
          <span className="font-semibold text-slate-700">+91 2423 258 500</span>
        </div>
      </div>
    </div>
  );
}
