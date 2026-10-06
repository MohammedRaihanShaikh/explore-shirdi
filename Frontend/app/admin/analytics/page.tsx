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
  Megaphone,
  Bell,
  Route,
  BellRing,
  TrendingUp,
  IndianRupee,
  Star,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AdminAnalytics } from "@/lib/api";
import {
  Card,
  CardHeader,
  StatCard,
  Loading,
  ErrorState,
  formatMoney,
  errorMessage,
  getToken,
} from "@/components/admin/ui";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.admin.analytics(token));
    } catch (e) {
      setError(errorMessage(e, "Unable to load analytics."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Crunching the numbers…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <ErrorState message="No analytics data available." onRetry={load} />;

  const maxMonth = Math.max(
    1,
    ...data.users.by_month.map((m) => m.count),
    ...data.bookings.by_month.map((m) => m.count)
  );
  const maxRating = Math.max(1, ...data.feedback.rating_distribution.map((r) => r.count));
  const maxType = Math.max(1, ...data.darshan.by_type.map((t) => t.count));
  const maxStay = Math.max(1, ...data.bookings.popular_stays.map((s) => s.bookings));

  const months = Array.from(
    new Set([
      ...data.users.by_month.map((m) => m.month),
      ...data.bookings.by_month.map((m) => m.month),
    ])
  ).sort();

  const bookingTotal = Math.max(
    1,
    data.bookings.pending + data.bookings.confirmed + data.bookings.cancelled + data.bookings.completed
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-serif font-bold text-slate-900">Analytics</h2>
        <p className="text-xs text-slate-500">
          Aggregated live from SQLite — users, bookings, stays, darshan and content
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Users"
          value={data.users.total.toLocaleString()}
          hint={`+${data.users.new_last_7_days} this week · +${data.users.new_last_30_days} this month`}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Bookings"
          value={data.bookings.total.toLocaleString()}
          hint={`${data.bookings.completed} completed`}
          icon={<CalendarCheck className="w-4 h-4" />}
          tone="warning"
        />
        <StatCard
          label="Revenue"
          value={formatMoney(data.bookings.revenue)}
          hint="Server-calculated totals"
          icon={<IndianRupee className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Avg. Rating"
          value={data.feedback.average_rating !== null ? data.feedback.average_rating.toFixed(1) : "—"}
          hint={`${data.feedback.total} reviews`}
          icon={<Star className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Signups & bookings per month */}
        <Card>
          <CardHeader
            title="Growth"
            description="New users and bookings per month"
            action={
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B45309] uppercase tracking-wide">
                <TrendingUp className="w-3.5 h-3.5" /> Live
              </span>
            }
          />
          <div className="px-5 py-4">
            {months.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {months.map((m) => {
                  const u = data.users.by_month.find((x) => x.month === m)?.count ?? 0;
                  const b = data.bookings.by_month.find((x) => x.month === m)?.count ?? 0;
                  return (
                    <div key={m}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-600">{m}</span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          {u} signups · {b} bookings
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#A73710]"
                            style={{ width: `${(u / maxMonth) * 100}%` }}
                          />
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${(b / maxMonth) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-1 text-[10px] font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#A73710]" /> Signups
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Bookings
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Booking status */}
        <Card>
          <CardHeader title="Booking Status" description="Distribution of all stay bookings" />
          <div className="px-5 py-4 space-y-3.5">
            {(
              [
                ["Confirmed", data.bookings.confirmed, "bg-emerald-500"],
                ["Pending", data.bookings.pending, "bg-amber-500"],
                ["Completed", data.bookings.completed, "bg-sky-500"],
                ["Cancelled", data.bookings.cancelled, "bg-red-400"],
              ] as const
            ).map(([label, count, cls]) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">{label}</span>
                  <span className="text-[11px] font-bold text-slate-800 tabular-nums">
                    {count}
                    <span className="text-slate-400 font-medium">
                      {" "}
                      ({Math.round((count / bookingTotal) * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cls}`}
                    style={{ width: `${(count / bookingTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Popular stays */}
        <Card>
          <CardHeader
            title="Most Booked Stays"
            description="Ranked by confirmed booking count"
            action={
              <Link
                href="/admin/stays"
                className="text-[11px] font-bold text-[#A73710] hover:underline"
              >
                Manage stays
              </Link>
            }
          />
          <div className="px-5 py-4">
            {data.bookings.popular_stays.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">No stay bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {data.bookings.popular_stays.map((s, i) => (
                  <div key={s.stay_id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#FBF6EC] border border-[#F2E3C8] flex items-center justify-center text-[10px] font-bold text-[#A73710] flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {s.stay_name}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 tabular-nums flex-shrink-0">
                          {s.bookings}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#A73710]"
                          style={{ width: `${(s.bookings / maxStay) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Darshan by type + rating distribution */}
        <div className="space-y-4 sm:space-y-5">
          <Card>
            <CardHeader title="Darshan Passes" description="By pass type" />
            <div className="px-5 py-4 space-y-3">
              {data.darshan.by_type.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No passes booked yet.</p>
              ) : (
                data.darshan.by_type.map((t) => (
                  <div key={t.type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-600 capitalize">
                        {t.type}
                      </span>
                      <span className="text-[11px] font-bold text-slate-800 tabular-nums">
                        {t.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${(t.count / maxType) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Rating Distribution" description="Devotee feedback" />
            <div className="px-5 py-4 space-y-2.5">
              {data.feedback.rating_distribution.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No ratings yet.</p>
              ) : (
                [...data.feedback.rating_distribution]
                  .sort((a, b) => Number(b.rating) - Number(a.rating))
                  .map((r) => (
                    <div key={r.rating} className="flex items-center gap-2.5">
                      <span className="w-8 text-[11px] font-bold text-slate-600 tabular-nums flex-shrink-0">
                        {r.rating}★
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${(r.count / maxRating) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-[11px] font-bold text-slate-700 tabular-nums flex-shrink-0">
                        {r.count}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Content & catalogue health */}
      <div>
        <h3 className="text-sm font-serif font-bold text-slate-900 mb-3">Content & Catalogue</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Places", value: data.content.places, icon: MapPin, href: "/admin/places" },
            { label: "Announcements", value: data.content.announcements, icon: Megaphone, href: "/admin/announcements" },
            { label: "Published", value: data.content.published_announcements, icon: Megaphone, href: "/admin/announcements" },
            { label: "Notifications", value: data.content.notifications, icon: Bell, href: "/admin/notifications" },
            { label: "Itineraries", value: data.content.itineraries, icon: Route, href: "/admin/analytics" },
            { label: "Active Reminders", value: data.content.active_reminders, icon: BellRing, href: "/admin/analytics" },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                href={c.href}
                className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-[#A73710]/40 hover:shadow-sm transition-colors group"
              >
                <Icon className="w-4 h-4 text-[#A73710] mb-2" />
                <p className="text-xl font-serif font-bold text-slate-900 tabular-nums">
                  {c.value}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 group-hover:text-[#B45309]">
                  {c.label}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Catalogue snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-[#FBF6EC] border border-[#F2E3C8] flex items-center justify-center text-[#A73710]">
            <BedDouble className="w-4 h-4" />
          </span>
          <div>
            <p className="text-lg font-serif font-bold text-slate-900 tabular-nums">
              {data.stays.active}
              <span className="text-xs font-sans font-medium text-slate-400">
                /{data.stays.total}
              </span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Active stays
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <p className="text-lg font-serif font-bold text-slate-900 tabular-nums">
              {data.darshan.upcoming}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Upcoming darshan
            </p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <MessageSquare className="w-4 h-4" />
          </span>
          <div>
            <p className="text-lg font-serif font-bold text-slate-900 tabular-nums">
              {data.feedback.pending_review}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Reviews pending
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
