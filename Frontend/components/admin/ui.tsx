"use client";

/**
 * Shared admin UI primitives — cards, tables, badges, modals, toasts,
 * pagination and the loading / empty / error states every admin screen needs.
 * One consistent visual language: white, beige, warm neutrals, saffron accents.
 */
import React, { useEffect } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  X,
} from "lucide-react";

export const getToken = (): string | null =>
  typeof window === "undefined" ? null : localStorage.getItem("shirdi_access_token");

/** Extract a readable message from an error thrown by the API client. */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  return `Rs.${Number(value).toLocaleString("en-IN")}`;
}

// ─── Card ─────────────────────────────────────────────────

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-xs ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
      <div>
        <h2 className="text-sm font-serif font-bold text-slate-900">{title}</h2>
        {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-[#FBF6EC] text-[#A73710] border-[#F2E3C8]",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-red-50 text-red-600 border-red-100",
  }[tone];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-400">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-serif font-bold text-slate-900 tabular-nums">
            {value}
          </p>
          {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
        </div>
        {icon && (
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${tones}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Badge ────────────────────────────────────────────────

const BADGE_TONES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-sky-50 text-sky-700 border-sky-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  admin: "bg-[#FDF0E3] text-[#A73710] border-[#F3D9BF]",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  new: "bg-amber-50 text-amber-700 border-amber-200",
  reviewed: "bg-sky-50 text-sky-700 border-sky-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  inactive: "bg-red-50 text-red-700 border-red-200",
  user: "bg-slate-100 text-slate-600 border-slate-200",
};

export function Badge({ value }: { value: string }) {
  const key = (value || "").toLowerCase();
  const tone = BADGE_TONES[key] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${tone}`}
    >
      {value}
    </span>
  );
}

export function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
      <span aria-hidden="true">★</span>
      <span className="tabular-nums">{Number(value).toFixed(1)}</span>
    </span>
  );
}

// ─── States ───────────────────────────────────────────────

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin text-[#A73710]" />
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-11 h-11 rounded-full bg-[#FBF6EC] border border-[#F2E3C8] flex items-center justify-center mb-3 text-[#B45309]">
        {icon || <Inbox className="w-5 h-5" />}
      </div>
      <p className="text-sm font-serif font-bold text-slate-800">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-11 h-11 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mb-3 text-red-600">
        <AlertCircle className="w-5 h-5" />
      </div>
      <p className="text-sm font-serif font-bold text-slate-800">Something went wrong</p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm break-words">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────

export function Pagination({
  page,
  pages,
  total,
  perPage,
  onPage,
  label = "items",
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
  label?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100">
      <p className="text-[11px] text-slate-500">
        Showing <span className="font-bold text-slate-700">{from}–{to}</span> of{" "}
        <span className="font-bold text-slate-700">{total}</span> {label}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2 text-[11px] font-semibold text-slate-600 tabular-nums">
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const width = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${width} bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-serif font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────

export interface ToastState {
  id: number;
  message: string;
  tone: "success" | "error";
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastState[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold ${
            t.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span className="flex-1 break-words">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const push = React.useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}

// ─── Buttons / fields ─────────────────────────────────────

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const variants = {
    primary: "bg-[#A73710] hover:bg-[#8F2E0C] text-white border-transparent",
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border-slate-200",
    danger: "bg-white hover:bg-red-50 text-red-600 border-red-200",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600 border-transparent",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-slate-600 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A73710]/20 focus:border-[#A73710] transition";

// ─── Table ────────────────────────────────────────────────

export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-slate-100 bg-[#FCFAF6]">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function TableEmpty({ colSpan, title, description }: { colSpan: number; title: string; description?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4">
        <EmptyState title={title} description={description} />
      </td>
    </tr>
  );
}
