"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Send, Bell, Users, ShieldCheck, Globe } from "lucide-react";
import { api } from "@/lib/api";
import type { NotificationItem, Paginated } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Modal,
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

interface FormState {
  title: string;
  message: string;
  audience: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  message: "",
  audience: "all",
  status: "draft",
};

const AUDIENCES = [
  { value: "all", label: "Everyone", icon: Globe, hint: "All signed-in pilgrims and admins" },
  { value: "users", label: "Pilgrims only", icon: Users, hint: "Regular user accounts" },
  { value: "admins", label: "Administrators", icon: ShieldCheck, hint: "Admin accounts only" },
] as const;

export default function AdminNotificationsPage() {
  const { toasts, push, dismiss } = useToasts();

  const [data, setData] = useState<Paginated<NotificationItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.admin.notifications(token, { status, page, per_page: PER_PAGE }));
    } catch (e) {
      setError(errorMessage(e, "Unable to load notifications."));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (n: NotificationItem) => {
    setEditing(n);
    setForm({ title: n.title, message: n.message, audience: n.audience, status: n.status });
    setOpen(true);
  };

  const save = async () => {
    const token = getToken();
    if (!token) return;

    if (form.title.trim().length < 2) {
      push("Title must be at least 2 characters.", "error");
      return;
    }
    if (form.message.trim().length < 2) {
      push("Message must be at least 2 characters.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.admin.updateNotification(editing.id, form, token);
        push("Notification updated.");
      } else {
        await api.admin.createNotification(form, token);
        push(form.status === "published" ? "Notification published." : "Notification saved as draft.");
      }
      setOpen(false);
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not save notification."), "error");
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async (n: NotificationItem) => {
    const token = getToken();
    if (!token) return;
    try {
      await api.admin.updateNotification(
        n.id,
        { title: n.title, message: n.message, audience: n.audience, status: "published" },
        token
      );
      push("Notification published.");
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not publish notification."), "error");
    }
  };

  const audienceMeta = (a: string) =>
    AUDIENCES.find((x) => x.value === a) || AUDIENCES[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Notifications</h2>
          <p className="text-xs text-slate-500">
            {data ? `${data.total} notification${data.total === 1 ? "" : "s"}` : "Loading…"} ·
            published ones are served by <span className="font-mono">GET /api/notifications</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New notification
        </Button>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={`${inputClass} sm:max-w-[200px]`}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {loading ? (
          <Loading label="Loading notifications…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table headers={["Title", "Audience", "Status", "Created", ""]}>
              {data && data.items.length === 0 ? (
                <TableEmpty
                  colSpan={5}
                  title="No notifications yet"
                  description="Create the first notification to reach pilgrims."
                />
              ) : (
                data?.items.map((n) => {
                  const meta = audienceMeta(n.audience);
                  const Icon = meta.icon;
                  return (
                    <tr key={n.id} className="hover:bg-[#FCFAF6] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-[#FBF6EC] border border-[#F2E3C8] flex items-center justify-center text-[#A73710] flex-shrink-0 mt-0.5">
                            <Bell className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                            <p className="text-[11px] text-slate-500 break-words max-w-md">
                              {n.message}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={n.status} />
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDate(n.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {n.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => publishDraft(n)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Publish
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(n)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                            title="Edit notification"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </Table>
            {data && (
              <Pagination
                page={data.page}
                pages={data.pages}
                total={data.total}
                perPage={data.per_page}
                onPage={setPage}
                label="notifications"
              />
            )}
          </>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit notification" : "New notification"}
        size="lg"
      >
        <div className="space-y-3.5">
          <Field label="Title">
            <input
              className={inputClass}
              value={form.title}
              placeholder="Kakad Aarti timings changed"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>

          <Field label="Message">
            <textarea
              className={`${inputClass} min-h-[100px] resize-y`}
              value={form.message}
              placeholder="Pilgrims are advised to reach the temple 30 minutes early."
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </Field>

          <div>
            <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Audience</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AUDIENCES.map((a) => {
                const Icon = a.icon;
                const active = form.audience === a.value;
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, audience: a.value }))}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-[#A73710] bg-[#FBF6EC]"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-[#A73710]" : "text-slate-400"}`} />
                      {a.label}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">{a.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Status" hint="Drafts are hidden from pilgrims until published">
            <div className="flex gap-2">
              {(["draft", "published"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold capitalize transition-colors ${
                    form.status === s
                      ? "border-[#A73710] bg-[#A73710] text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
