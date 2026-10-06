"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, Sparkles, Calendar, Users, DoorOpen } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminDarshan, BookingStatusValue, Paginated } from "@/lib/api";
import {
  Badge,
  Card,
  ErrorState,
  Loading,
  Pagination,
  Table,
  TableEmpty,
  ToastStack,
  errorMessage,
  formatDate,
  formatMoney,
  getToken,
  inputClass,
  useToasts,
} from "@/components/admin/ui";

const PER_PAGE = 20;
const STATUSES: BookingStatusValue[] = ["pending", "confirmed", "cancelled", "completed"];

export default function AdminDarshanPage() {
  const { toasts, push, dismiss } = useToasts();

  const [data, setData] = useState<Paginated<AdminDarshan> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [passType, setPassType] = useState("");
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
        await api.admin.darshan(token, {
          search: query,
          status,
          pass_type: passType,
          page,
          per_page: PER_PAGE,
        })
      );
    } catch (e) {
      setError(errorMessage(e, "Unable to load darshan passes."));
    } finally {
      setLoading(false);
    }
  }, [query, status, passType, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (pass: AdminDarshan, next: BookingStatusValue) => {
    const token = getToken();
    if (!token) return;
    setBusyId(pass.id);
    try {
      const updated = await api.admin.setDarshanStatus(pass.id, next, token);
      push(`Pass ${updated.booking_ref} marked ${next}.`);
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not update pass."), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Darshan Passes</h2>
          <p className="text-xs text-slate-500">
            {data ? `${data.total} pass${data.total === 1 ? "" : "es"}` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Sparkles className="w-4 h-4 text-[#A73710]" />
          Gate allocation is confirmed by temple staff
        </div>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, devotee name or email…"
              className={`${inputClass} pl-8`}
              aria-label="Search darshan passes"
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
            value={passType}
            onChange={(e) => {
              setPassType(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label="Filter by pass type"
          >
            <option value="">All pass types</option>
            <option value="general">General</option>
            <option value="vip">VIP</option>
            <option value="free">Free / Donation</option>
          </select>
        </div>

        {loading ? (
          <Loading label="Loading darshan passes…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table
              headers={[
                "Reference",
                "Devotee",
                "Pass type",
                "Visit date",
                "Devotees",
                "Paid",
                "Gate",
                "Status",
                "",
              ]}
            >
              {data && data.items.length === 0 ? (
                <TableEmpty
                  colSpan={9}
                  title="No darshan passes found"
                  description="Passes booked by pilgrims will appear here."
                />
              ) : (
                data?.items.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FCFAF6] transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">
                      {p.booking_ref}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800">{p.user_name}</p>
                      <p className="text-[10px] text-slate-400">{p.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={p.pass_type} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDate(p.visit_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        {p.num_devotees}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">
                      {p.price_paid === 0 ? (
                        <span className="text-emerald-700">Free</span>
                      ) : (
                        formatMoney(p.price_paid)
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {p.gate_number ? (
                        <span className="inline-flex items-center gap-1">
                          <DoorOpen className="w-3 h-3 text-slate-400" />
                          {p.gate_number}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {STATUSES.filter((s) => s !== p.status).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => changeStatus(p, s)}
                            disabled={busyId === p.id}
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
                label="passes"
              />
            )}
          </>
        )}
      </Card>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
