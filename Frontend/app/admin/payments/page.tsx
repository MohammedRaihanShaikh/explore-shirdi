"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, Eye, CheckCircle2, XCircle, RotateCcw, Filter, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminPayment, Paginated } from "@/lib/api";
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
const STATUSES = ["created", "paid", "failed", "refunded"];
const ENTITY_TYPES = ["stay", "dining", "darshan"];

export default function AdminPaymentsPage() {
  const { toasts, push, dismiss } = useToasts();

  const [data, setData] = useState<Paginated<AdminPayment> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AdminPayment | null>(null);
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
        await api.admin.payments(token, {
          search: query,
          status,
          entity_type: entityType,
          page,
          per_page: PER_PAGE,
        })
      );
    } catch (e) {
      setError(errorMessage(e, "Unable to load payments."));
    } finally {
      setLoading(false);
    }
  }, [query, status, entityType, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerifyUtr = async (payment: AdminPayment) => {
    const token = getToken();
    if (!token) return;
    const utr = prompt(`Enter UTR for payment ${payment.booking_ref}:`);
    if (!utr) return;
    
    setBusyId(payment.id);
    try {
      const updated = await api.admin.verifyUtr(payment.id, utr, token);
      push(`UTR verified for ${updated.booking_ref}.`);
      await load();
      setViewing((v) => (v && v.id === payment.id ? updated : v));
    } catch (e) {
      push(errorMessage(e, "Could not verify UTR."), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkPaid = async (payment: AdminPayment) => {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Manually mark payment ${payment.booking_ref} as PAID?`)) return;
    
    setBusyId(payment.id);
    try {
      const updated = await api.admin.setPaymentStatus(payment.id, "paid", token);
      push(`Payment ${updated.booking_ref} marked as paid.`);
      await load();
      setViewing((v) => (v && v.id === payment.id ? updated : v));
    } catch (e) {
      push(errorMessage(e, "Could not update payment."), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkFailed = async (payment: AdminPayment) => {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Mark payment ${payment.booking_ref} as FAILED?`)) return;
    
    setBusyId(payment.id);
    try {
      const updated = await api.admin.setPaymentStatus(payment.id, "failed", token);
      push(`Payment ${updated.booking_ref} marked as failed.`);
      await load();
      setViewing((v) => (v && v.id === payment.id ? updated : v));
    } catch (e) {
      push(errorMessage(e, "Could not update payment."), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Payment Details</h2>
          <p className="text-xs text-slate-500">
            {data ? `${data.total} payment${data.total === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          Track all payments (Stays, Dining, Darshan) and verify UTRs.
        </p>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, booking ref, UTR, user email…"
              className={`${inputClass} pl-8`}
              aria-label="Search payments"
            />
          </div>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label="Filter by entity type"
          >
            <option value="">All Types</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
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
          <Loading label="Loading payments…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table
              headers={[
                "Booking Ref",
                "Type",
                "Guest",
                "Amount",
                "Status",
                "Method",
                "UTR",
                "Created",
                "",
              ]}
            >
              {data && data.items.length === 0 ? (
                <TableEmpty
                  colSpan={9}
                  title="No payments found"
                  description="Payments made by pilgrims will appear here."
                />
              ) : (
                data?.items.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FCFAF6] transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">
                      {p.booking_ref}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={p.entity_type} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800">{p.user_name}</p>
                      <p className="text-[10px] text-slate-400">{p.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">
                      {formatMoney(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={p.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 capitalize whitespace-nowrap">
                      {p.payment_method || "—"}
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-slate-600 whitespace-nowrap break-all">
                      {p.utr || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                          title="View payment"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
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
                label="payments"
              />
            )}
          </>
        )}
      </Card>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Payment details" size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-serif font-bold text-slate-900">
                {viewing.booking_ref}
              </span>
              <Badge value={viewing.status} />
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Booking Ref", viewing.booking_ref],
                ["Entity Type", viewing.entity_type.charAt(0).toUpperCase() + viewing.entity_type.slice(1)],
                ["Guest", viewing.user_name],
                ["Email", viewing.user_email],
                ["Amount", formatMoney(viewing.amount)],
                ["Currency", viewing.currency],
                ["Status", viewing.status.charAt(0).toUpperCase() + viewing.status.slice(1)],
                ["Method", (viewing.payment_method || "—").charAt(0).toUpperCase() + (viewing.payment_method || "—").slice(1)],
                ["UTR", viewing.utr || "—"],
                ["Razorpay Order ID", viewing.razorpay_order_id || "—"],
                ["Razorpay Payment ID", viewing.razorpay_payment_id || "—"],
                ["Created", formatDateTime(viewing.created_at)],
                ["Updated", formatDateTime(viewing.updated_at)],
                ["Paid At", formatDateTime(viewing.paid_at)],
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

            <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
              {viewing.status === "created" && (
                <>
                  <Button
                    variant="primary"
                    disabled={busyId === viewing.id}
                    onClick={() => handleVerifyUtr(viewing)}
                  >
                    <Loader2 className={`w-3.5 h-3.5 ${busyId === viewing.id ? "animate-spin" : ""}`} />
                    Verify UTR
                  </Button>
                  <Button
                    variant="primary"
                    disabled={busyId === viewing.id}
                    onClick={() => handleMarkPaid(viewing)}
                  >
                    Mark Paid
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busyId === viewing.id}
                    onClick={() => handleMarkFailed(viewing)}
                  >
                    Mark Failed
                  </Button>
                </>
              )}
              {viewing.status === "paid" && (
                <Button
                  variant="danger"
                  disabled={busyId === viewing.id}
                  onClick={() => handleMarkFailed(viewing)}
                >
                  Mark Failed
                </Button>
              )}
              {viewing.status === "failed" && (
                <Button
                  variant="primary"
                  disabled={busyId === viewing.id}
                  onClick={() => handleMarkPaid(viewing)}
                >
                  Mark Paid
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}