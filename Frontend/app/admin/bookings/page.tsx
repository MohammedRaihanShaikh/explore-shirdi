"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, Eye, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminBooking, BookingStatusValue, Paginated } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Loading,
  Modal,
  Pagination,
  Table,
  TableEmpty,
  ToastStack,
  errorMessage,
  formatDate,
  formatDateTime,
  formatMoney,
  getToken,
  inputClass,
  useToasts,
} from "@/components/admin/ui";

const PER_PAGE = 20;
const STATUSES: BookingStatusValue[] = ["pending", "confirmed", "cancelled", "completed"];

const STATUS_ACTIONS: { label: string; value: BookingStatusValue; icon: React.ReactNode }[] = [
  { label: "Confirm", value: "confirmed", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { label: "Cancel", value: "cancelled", icon: <XCircle className="w-3.5 h-3.5" /> },
  { label: "Complete", value: "completed", icon: <RotateCcw className="w-3.5 h-3.5" /> },
];

export default function AdminBookingsPage() {
  const { toasts, push, dismiss } = useToasts();

  const [data, setData] = useState<Paginated<AdminBooking> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AdminBooking | null>(null);
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
        await api.admin.bookings(token, {
          search: query,
          status,
          page,
          per_page: PER_PAGE,
        })
      );
    } catch (e) {
      setError(errorMessage(e, "Unable to load bookings."));
    } finally {
      setLoading(false);
    }
  }, [query, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (booking: AdminBooking, next: BookingStatusValue) => {
    const token = getToken();
    if (!token) return;
    setBusyId(booking.id);
    try {
      const updated = await api.admin.setBookingStatus(booking.id, next, token);
      push(`Booking ${updated.booking_ref} marked ${next}.`);
      await load();
      setViewing((v) => (v && v.id === booking.id ? updated : v));
    } catch (e) {
      push(errorMessage(e, "Could not update booking."), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Stay Bookings</h2>
          <p className="text-xs text-slate-500">
            {data ? `${data.total} booking${data.total === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          Prices shown are the server-calculated totals stored in SQLite.
        </p>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, stay, guest name or email…"
              className={`${inputClass} pl-8`}
              aria-label="Search bookings"
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
        </div>

        {loading ? (
          <Loading label="Loading bookings…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table
              headers={[
                "Reference",
                "Guest",
                "Stay",
                "Check-in",
                "Check-out",
                "Guests",
                "Price",
                "Status",
                "",
              ]}
            >
              {data && data.items.length === 0 ? (
                <TableEmpty
                  colSpan={9}
                  title="No bookings found"
                  description="Bookings made by pilgrims will appear here."
                />
              ) : (
                data?.items.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FCFAF6] transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">
                      {b.booking_ref}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800">{b.user_name}</p>
                      <p className="text-[10px] text-slate-400">{b.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{b.stay_name}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDate(b.check_in)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDate(b.check_out)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                      {b.num_guests} · {b.num_rooms}r
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap tabular-nums">
                      {formatMoney(b.total_price)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                          title="View booking"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {STATUSES.filter((s) => s !== b.status).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => changeStatus(b, s)}
                            disabled={busyId === b.id}
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
                label="bookings"
              />
            )}
          </>
        )}
      </Card>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Booking details" size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-serif font-bold text-slate-900">
                {viewing.booking_ref}
              </span>
              <Badge value={viewing.status} />
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ["Guest", viewing.user_name],
                ["Email", viewing.user_email],
                ["Stay", viewing.stay_name],
                ["Check-in", formatDateTime(viewing.check_in)],
                ["Check-out", formatDateTime(viewing.check_out)],
                ["Guests", String(viewing.num_guests)],
                ["Rooms", String(viewing.num_rooms)],
                ["Total price", formatMoney(viewing.total_price)],
                ["Created", formatDateTime(viewing.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#FCFAF6] border border-slate-100 px-3 py-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</dt>
                  <dd className="text-xs font-semibold text-slate-800 break-words">{v}</dd>
                </div>
              ))}
            </dl>

            {viewing.special_requests && (
              <div className="rounded-xl bg-[#FBF6EC] border border-[#F2E3C8] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#B45309]">
                  Special requests
                </p>
                <p className="text-xs text-slate-700 mt-1">{viewing.special_requests}</p>
              </div>
            )}

            {/* Payment Details */}
            {(viewing.payment_status || viewing.payment_method || viewing.utr) && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 mb-2">
                  Payment Details
                </p>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-white border border-emerald-100 p-2">
                    <dt className="font-bold uppercase tracking-wide text-emerald-600">Payment Status</dt>
                    <dd className="font-semibold text-slate-800 capitalize">{viewing.payment_status || "—"}</dd>
                  </div>
                  <div className="rounded-lg bg-white border border-emerald-100 p-2">
                    <dt className="font-bold uppercase tracking-wide text-emerald-600">Method</dt>
                    <dd className="font-semibold text-slate-800 capitalize">{viewing.payment_method || "—"}</dd>
                  </div>
                  <div className="rounded-lg bg-white border border-emerald-100 p-2">
                    <dt className="font-bold uppercase tracking-wide text-emerald-600">Paid At</dt>
                    <dd className="font-semibold text-slate-800">
                      {viewing.paid_at ? formatDateTime(viewing.paid_at) : "—"}
                    </dd>
                  </div>
                  {viewing.utr && (
                    <div className="rounded-lg bg-white border border-emerald-100 p-2 col-span-2 sm:col-span-4">
                      <dt className="font-bold uppercase tracking-wide text-emerald-600">UTR / Transaction ID</dt>
                      <dd className="font-semibold text-slate-800 font-mono text-[10px] break-all">{viewing.utr}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
              {STATUS_ACTIONS.filter((a) => a.value !== viewing.status).map((a) => (
                <Button
                  key={a.value}
                  variant={a.value === "cancelled" ? "danger" : "primary"}
                  disabled={busyId === viewing.id}
                  onClick={() => changeStatus(viewing, a.value)}
                >
                  {a.icon} {a.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
