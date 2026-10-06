"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, Star, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import type { FeedbackItem, Paginated } from "@/lib/api";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Pagination,
  Table,
  TableEmpty,
  ToastStack,
  errorMessage,
  formatDate,
  getToken,
  inputClass,
  useToasts,
} from "@/components/admin/ui";

const PER_PAGE = 20;
const STATUSES = ["new", "reviewed", "resolved"] as const;
type FeedbackStatus = (typeof STATUSES)[number];

export default function AdminFeedbackPage() {
  const { toasts, push, dismiss } = useToasts();

  const [data, setData] = useState<Paginated<FeedbackItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [minRating, setMinRating] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setData(
        await api.admin.feedback(token, {
          search: query,
          status,
          min_rating: minRating ? Number(minRating) : undefined,
          page,
          per_page: PER_PAGE,
        })
      );
    } catch (e) {
      setError(errorMessage(e, "Unable to load feedback."));
    } finally {
      setLoading(false);
    }
  }, [query, status, minRating, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (item: FeedbackItem, next: FeedbackStatus) => {
    const token = getToken();
    if (!token) return;
    setBusyId(item.id);
    try {
      await api.admin.setFeedbackStatus(item.id, next, token);
      push(`Feedback marked ${next}.`);
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not update feedback."), "error");
    } finally {
      setBusyId(null);
    }
  };

  const stars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < rating ? "fill-current text-amber-500" : "text-slate-200"}`}
      />
    ));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Devotee Feedback</h2>
          <p className="text-xs text-slate-500">
            {data ? `${data.total} response${data.total === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-[#A73710]" />
          Submitted through <span className="font-mono">POST /api/feedback</span>
        </div>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search comments or devotee names…"
              className={`${inputClass} pl-8`}
              aria-label="Search feedback"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={minRating}
            onChange={(e) => {
              setMinRating(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label="Filter by minimum rating"
          >
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r}★ and above
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loading label="Loading feedback…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table headers={["Rating", "Devotee", "Comment", "Received", "Status", ""]}>
              {data && data.items.length === 0 ? (
                <TableEmpty
                  colSpan={6}
                  title="No feedback matches these filters"
                  description="Devotee reviews will appear here once submitted."
                />
              ) : (
                data?.items.map((f) => (
                  <tr key={f.id} className="hover:bg-[#FCFAF6] transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-0.5">{stars(f.rating)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800">{f.user_name}</p>
                      {f.user_email && (
                        <p className="text-[10px] text-slate-400">{f.user_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600 max-w-md whitespace-normal break-words">
                        {f.comment}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(f.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={f.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {STATUSES.filter((s) => s !== f.status).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => changeStatus(f, s)}
                            disabled={busyId === f.id}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 capitalize"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </Table>
            {data && (
              <Pagination
                page={data.page}
                pages={data.pages}
                total={data.total}
                perPage={data.per_page}
                onPage={setPage}
                label="reviews"
              />
            )}
          </>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
