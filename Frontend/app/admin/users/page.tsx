"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search,
  Users as UsersIcon,
  Eye,
  Pencil,
  ShieldCheck,
  UserX,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser, Paginated } from "@/lib/api";
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Loading,
  Modal,
  Pagination,
  Table,
  TableEmpty,
  Badge,
  ToastStack,
  errorMessage,
  formatDate,
  formatDateTime,
  getToken,
  inputClass,
  useToasts,
} from "@/components/admin/ui";

const PER_PAGE = 20;

export default function AdminUsersPage() {
  const { toasts, push, dismiss } = useToasts();

  const [data, setData] = useState<Paginated<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [page, setPage] = useState(1);

  const [viewing, setViewing] = useState<AdminUser | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", devotee_type: "General Devotee" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  // Destructive / irreversible-looking actions always ask for confirmation first.
  const [confirming, setConfirming] = useState<AdminUser | null>(null);

  // Debounce the free-text search so we page server-side, not client-side.
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
        await api.admin.users(token, {
          search: query,
          role,
          status: statusFilter,
          sort,
          page,
          per_page: PER_PAGE,
        })
      );
    } catch (e) {
      setError(errorMessage(e, "Unable to load users."));
    } finally {
      setLoading(false);
    }
  }, [query, role, statusFilter, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({
      full_name: u.full_name,
      phone: u.phone || "",
      devotee_type: u.devotee_type,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await api.admin.updateUser(
        editing.id,
        {
          full_name: form.full_name,
          phone: form.phone || null,
          devotee_type: form.devotee_type,
        },
        token
      );
      push("User updated.");
      setEditing(null);
      await load();
      setViewing((v) => (v && v.id === editing.id ? { ...v, ...form } : v));
    } catch (e) {
      push(errorMessage(e, "Could not update user."), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: AdminUser) => {
    const token = getToken();
    if (!token) return;
    setBusyId(u.id);
    try {
      const updated = await api.admin.setUserStatus(u.id, !u.is_active, token);
      push(updated.is_active ? `${u.full_name} activated.` : `${u.full_name} deactivated.`);
      await load();
      setViewing((v) => (v && v.id === u.id ? updated : v));
    } catch (e) {
      push(errorMessage(e, "Could not change account status."), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Users</h2>
          <p className="text-xs text-slate-500">
            {data ? `${data.total} registered account${data.total === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <UsersIcon className="w-4 h-4 text-[#A73710]" />
          Passwords and roles are never exposed or editable here.
        </div>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone…"
              className={`${inputClass} pl-8`}
              aria-label="Search users"
            />
          </div>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className={inputClass}
            aria-label="Sort users"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="email_asc">Email A–Z</option>
          </select>
        </div>

        {loading ? (
          <Loading label="Loading users…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table headers={["Name", "Email", "Role", "Status", "Bookings", "Registered", ""]}>
              {data && data.items.length === 0 ? (
                <TableEmpty
                  colSpan={7}
                  title="No users match these filters"
                  description="Try clearing the search box or changing the filters."
                />
              ) : (
                data?.items.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FCFAF6] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-[#FBF6EC] border border-[#F2E3C8] flex items-center justify-center text-[10px] font-bold text-[#A73710] flex-shrink-0">
                          {u.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge value={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={u.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                      {u.booking_count}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                          title="Edit profile"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(u)}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            u.is_active
                              ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={u.is_active ? "Deactivate account" : "Activate account"}
                        >
                          {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
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
                label="users"
              />
            )}
          </>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="User details">
        {viewing && (
          <div className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["Name", viewing.full_name],
                ["Email", viewing.email],
                ["Phone", viewing.phone || "—"],
                ["Role", viewing.role],
                ["Devotee type", viewing.devotee_type],
                ["Status", viewing.is_active ? "Active" : "Inactive"],
                ["Verified", viewing.is_verified ? "Yes" : "No"],
                ["Registered", formatDateTime(viewing.created_at)],
                ["Stay bookings", String(viewing.booking_count)],
                ["Darshan passes", String(viewing.darshan_count)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#FCFAF6] border border-slate-100 px-3 py-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k}</dt>
                  <dd className="text-xs font-semibold text-slate-800 break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setViewing(null)}>
                Close
              </Button>
              <Button onClick={() => openEdit(viewing)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal — explicit allow-list, never passwords or roles */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit user profile">
        {editing && (
          <div className="space-y-3.5">
            <p className="flex items-start gap-2 text-[11px] text-slate-500 bg-[#FBF6EC] border border-[#F2E3C8] rounded-xl px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B45309] mt-0.5 flex-shrink-0" />
              Only profile fields can be changed here. Passwords, roles and account status are
              handled separately and are never sent in this request.
            </p>
            <Field label="Full name">
              <input
                className={inputClass}
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={form.phone}
                placeholder="+919876543210"
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
            <Field label="Devotee type">
              <select
                className={inputClass}
                value={form.devotee_type}
                onChange={(e) => setForm((f) => ({ ...f, devotee_type: e.target.value }))}
              >
                {[
                  "General Devotee",
                  "Senior Citizen (60+)",
                  "Family with Kids",
                  "Overseas / NRI",
                  "First Time Visitor",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation dialog — shown before any account status change */}
      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={confirming?.is_active ? "Deactivate this account?" : "Reactivate this account?"}
        size="sm"
      >
        {confirming && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span
                className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  confirming.is_active
                    ? "bg-red-50 border-red-100 text-red-600"
                    : "bg-emerald-50 border-emerald-100 text-emerald-600"
                }`}
              >
                {confirming.is_active ? (
                  <UserX className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">
                  {confirming.full_name}
                </p>
                <p className="text-[11px] text-slate-500 break-words">{confirming.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirming.is_active ? (
                <>
                  Deactivating this account will immediately block{" "}
                  <span className="font-semibold text-slate-800">{confirming.full_name}</span> from
                  signing in. Their bookings, darshan passes and feedback are{" "}
                  <span className="font-semibold text-slate-800">not deleted</span> — only access is
                  revoked. You can reactivate the account at any time.
                </>
              ) : (
                <>
                  Reactivating will restore sign-in access for{" "}
                  <span className="font-semibold text-slate-800">{confirming.full_name}</span>. Their
                  existing bookings and passes remain untouched.
                </>
              )}
            </p>

            <div className="rounded-xl bg-[#FBF6EC] border border-[#F2E3C8] px-3 py-2.5">
              <p className="text-[11px] text-slate-600">
                <span className="font-bold text-[#A73710]">Please confirm:</span>{" "}
                {confirming.is_active
                  ? "the user will lose access until you reactivate them."
                  : "the user will be able to sign in again immediately."}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button
                variant={confirming.is_active ? "danger" : "primary"}
                disabled={busyId === confirming.id}
                onClick={async () => {
                  const target = confirming;
                  setConfirming(null);
                  await toggleStatus(target);
                }}
              >
                {busyId === confirming.id
                  ? "Working…"
                  : confirming.is_active
                    ? "Yes, deactivate"
                    : "Yes, reactivate"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
