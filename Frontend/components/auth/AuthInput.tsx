"use client";

import React, { ReactNode, useId } from "react";
import { AlertCircle } from "lucide-react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  badge?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  containerClassName?: string;
}

export default function AuthInput({
  label,
  badge,
  error,
  helperText,
  leftIcon,
  rightElement,
  containerClassName = "",
  className = "",
  id,
  ...props
}: AuthInputProps) {
  const inputId = id || props.name || "input";

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {(label || badge) && (
        <div className="flex items-center justify-between text-xs font-semibold">
          {label && (
            <label htmlFor={inputId} className="text-slate-700 font-medium">
              {label}
            </label>
          )}
          {badge && <span className="text-slate-400 font-normal">{badge}</span>}
        </div>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          className={`w-full min-w-0 bg-[#F8FAFC] border ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-200 focus:border-[#C2410C] focus:ring-amber-500/15"
          } rounded-xl py-2.5 sm:py-3 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 transition-all focus:outline-none focus:ring-4 ${
            leftIcon ? "pl-10 sm:pl-11" : "pl-3.5"
          } ${rightElement ? "pr-24" : "pr-3.5"} ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-1.5 text-xs text-red-600 mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <span className="text-xs text-slate-500">{helperText}</span>
      ) : null}
    </div>
  );
}
