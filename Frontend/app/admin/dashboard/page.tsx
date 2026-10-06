"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  BedDouble,
  Sparkles,
  MessageSquare,
  MapPin,
  TrendingUp,
  IndianRupee,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AdminDashboard } from "@/lib/api";
import {
  Card,
  CardHeader,
  StatCard,
  Loading,
  ErrorState,
  formatMoney,
  formatDate,
  errorMessage,
  getToken,
} from "@/components/admin/ui";

const ACTIVITY_ICONS: Record<string, string> = {
  user_registered: "bg-[#FBF6EC] text-[#A73710]",
  stay_booking: "bg-emerald-50 text-emerald-700",
  darshan_pass: "bg-sky-50 text-sky-700",
  feedback: "bg-amber-50 text-amber-700",
  announcement: "bg-violet-50 text-violet-700",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.admin.dashboard(token));
    } catch (e) {
      setError(errorMessage(e, "Unable to load dashboard statistics."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading dashboard statistics…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <ErrorState message="No dashboard data available." onRetry={load} />;

  const totalStatus =
    data.pending_bookings + data.confirmed_bookings + data.cancelled_bookings + data.completed_bookings;

  const statusBars = [
    { label: "Confirmed", count: data.confirmed_bookings, className: "bg-emerald-500" },
    { label: "Pending", count: data.pending_bookings, className: "bg-amber-500" },
    { label: "Cancelled", count: data.cancelled_bookings, className: "bg-red-400" },
    { label: "Completed", count: data.completed_bookings, className: "bg-sky-500" },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards — every value comes from SQLite via /api/admin/dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Users"
          value={data.total_users.toLocaleString()}
          hint={`${data.new_users_7d} new in the last 7 days`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Total Bookings"
          value={data.total_bookings.toLocaleString()}
          hint={`${data.pending_bookings} awaiting confirmation`}
          icon={<CalendarCheck className="w-4 h-4" />}
          tone="warning"
        />
        <StatCard
          label="Active Stays"
          value={data.active_stays}
          hint={`${data.total_stays} in catalog`}
          icon={<BedDouble className="w-4 h-4" />}
        />
        <StatCard
          label="Booking Revenue"
          value={formatMoney(data.booking_revenue)}
          hint="Server-calculated totals"
          icon={<IndianRupee className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Darshan Passes"
          value={data.total_darshan_passes.toLocaleString()}
          hint={`${data.upcoming_darshan_passes} upcoming`}
          icon={<Sparkles className="w-4 h-4" />}
        />
        <StatCard
          label="Total Places"
          value={data.total_places}
          hint={`${data.active_places} published`}
          icon={<MapPin className="w-4 h-4" />}
        />
        <StatCard
          label="Feedback"
          value={data.total_feedback.toLocaleString()}
          hint={
            data.average_rating !== null
              ? `Average rating ${data.average_rating.toFixed(1)} / 5`
              : "No ratings yet"
          }
          icon={<MessageSquare className="w-4 h-4" />}
        />
        <StatCard
          label="AI Itineraries"
          value={data.total_itineraries.toLocaleString()}
          hint={`${data.active_reminders} active aarti reminders`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Activity"
            description="Live feed of real events from the database"
            action={
              <Link
                href="/admin/bookings"
                className="text-[11px] font-bold text-[#A73710] hover:underline"
              >
                View bookings
              </Link>
            }
          />
          {data.recent_activity.length === 0 ? (
            <p className="px-5 py-10 text-center text-xs text-slate-400">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_activity.map((item, i) => (
                <li key={`${item.type}-${i}`} className="flex items-start gap-3 px-5 py-3">
                  <span
                    className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                      ACTIVITY_ICONS[item.type] || "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.type === "user_registered"
                      ? "U"
                      : item.type === "stay_booking"
                        ? "S"
                        : item.type === "darshan_pass"
                          ? "D"
                          : item.type === "feedback"
                            ? "F"
                            : "A"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{item.detail}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                    {formatDate(item.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Booking breakdown */}
        <Card>
          <CardHeader title="Booking Status" description="All stay bookings" />
          <div className="px-5 py-4 space-y-3.5">
            {statusBars.map((s) => {
              const pct = totalStatus > 0 ? (s.count / totalStatus) * 100 : 0;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-600">{s.label}</span>
                    <span className="text-[11px] font-bold text-slate-800 tabular-nums">
                      {s.count}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.className} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-4 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#FBF6EC] border border-[#F2E3C8] px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#B45309]">
                Reminders
              </p>
              <p className="text-lg font-serif font-bold text-slate-900">
                {data.active_reminders}
                <span className="text-[11px] font-sans font-medium text-slate-400">
                  /{data.total_reminders}
                </span>
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Cancelled
              </p>
              <p className="text-lg font-serif font-bold text-slate-900">
                {data.cancelled_darshan_passes}
              </p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-2">
            <Link
              href="/admin/users"
              className="px-3 py-2 rounded-xl bg-[#A73710] text-white text-[11px] font-semibold hover:bg-[#8F2E0C]"
            >
              Manage users
            </Link>
            <Link
              href="/admin/analytics"
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold hover:bg-slate-50"
            >
              View analytics
            </Link>
          </div>
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Clock className="w-3 h-3" />
        Statistics are computed live from SQLite on every page load — nothing on this screen is
        cached or hardcoded.
      </p>
    </div>
  );
}
