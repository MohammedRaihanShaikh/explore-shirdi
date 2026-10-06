"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from "lucide-react";

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  showStrengthMeter?: boolean;
  showForgotPassword?: boolean;
  forgotPasswordHref?: string;
}

export default function PasswordInput({
  label = "Password",
  error,
  showStrengthMeter = false,
  showForgotPassword = false,
  forgotPasswordHref = "/forgot-password",
  id,
  value = "",
  onChange,
  className = "",
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  // Unique per instance so two password fields on one form never share an id
  // (duplicate ids make <label htmlFor> point at the wrong input).
  const generatedId = useId();
  const inputId = id || generatedId;
  const passwordStr = String(value || "");

  // Strength evaluation
  const hasLength = passwordStr.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordStr);
  const hasNumber = /[0-9]/.test(passwordStr);
  const hasSpecial = /[^A-Za-z0-9]/.test(passwordStr);

  const passedCount = [hasLength, hasUpper, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  let strengthLabel = "Weak";
  let strengthColor = "bg-red-400";
  let strengthWidth = "w-1/4";

  if (passedCount === 2) {
    strengthLabel = "Fair";
    strengthColor = "bg-amber-400";
    strengthWidth = "w-2/4";
  } else if (passedCount === 3) {
    strengthLabel = "Good";
    strengthColor = "bg-blue-400";
    strengthWidth = "w-3/4";
  } else if (passedCount === 4) {
    strengthLabel = "Strong";
    strengthColor = "bg-emerald-500";
    strengthWidth = "w-full";
  }

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <label htmlFor={inputId} className="text-slate-700 font-medium">
          {label}
        </label>
        {showForgotPassword && (
          <Link
            href={forgotPasswordHref}
            className="text-[#C2410C] hover:text-[#9A3412] font-medium transition-colors hover:underline"
          >
            Forgot Password?
          </Link>
        )}
      </div>

      <div className="relative flex items-center">
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
          <Lock className="w-4 h-4" />
        </div>

        <input
          id={inputId}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={onChange}
          className={`w-full min-w-0 bg-[#F8FAFC] border ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-[#C2410C] focus:ring-amber-500/15"
          } rounded-xl py-2.5 sm:py-3 pl-10 sm:pl-11 pr-10 sm:pr-11 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 transition-all focus:outline-none focus:ring-4 ${className}`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="absolute right-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
          tabIndex={-1}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showStrengthMeter && passwordStr.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Password strength:</span>
            <span className="font-semibold text-slate-700">{strengthLabel}</span>
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${strengthColor} ${strengthWidth} transition-all duration-300 rounded-full`}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              {hasLength ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className={hasLength ? "text-emerald-700 font-medium" : ""}>
                8+ characters
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasUpper ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className={hasUpper ? "text-emerald-700 font-medium" : ""}>
                1 uppercase letter
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasNumber ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className={hasNumber ? "text-emerald-700 font-medium" : ""}>
                1 number
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasSpecial ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className={hasSpecial ? "text-emerald-700 font-medium" : ""}>
                1 special character
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
