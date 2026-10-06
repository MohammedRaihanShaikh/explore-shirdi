"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Megaphone, Send, Globe } from "lucide-react";
import { api } from "@/lib/api";
import type { AnnouncementItem, Paginated } from "@/lib/api";
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
  status: string;
}

const EMPTY_FORM: FormState = { title: "", message: "", status: "draft" };

export default function AdminAnnouncementsPage() {
  const { toasts, push, dismiss } = useToasts();

  const [data, setData] = useState<Paginated<AnnouncementItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.admin.announcements(token, { status, page, per_page: PER_PAGE }));
    } catch (e) {
      setError(errorMessage(e, "Unable to load announcements."));
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

  const openEdit = (a: AnnouncementItem) => {
    setEditing(a);
    setForm({ title: a.title, message: a.message, status: a.status });
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
        await api.admin.updateAnnouncement(editing.id, form, token);
        push("Announcement updated.");
      } else {
        await api.admin.createAnnouncement(form, token);
        push(form.status === "published" ? "Announcement published." : "Saved as draft.");
      }
      setOpen(false);
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not save announcement."), "error");
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async (a: AnnouncementItem) => {
    const token = getToken();
    if (!token) return;
    try {
      await api.admin.updateAnnouncement(
        a.id,
        { title: a.title, message: a.message, status: "published" },
        token
      );
      push("Announcement published.");
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not publish announcement."), "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Announcements</h2>
          <p className="text-xs text-slate-500">
            {data ? `${data.total} announcement${data.total === 1 ? "" : "s"}` : "Loading…"} ·
            published ones are served by <span className="font-mono">GET /api/announcements</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> New announcement
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
          <Loading label="Loading announcements…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Table headers={["Title", "Message", "Status", "Created", "Updated", ""]}>
              {data && data.items.length === 0 ? (
                <TableEmpty
                  colSpan={6}
                  title="No announcements yet"
                  description="Publish the first announcement to keep pilgrims informed."
                />
              ) : (
                data?.items.map((a) => (
                  <tr key={a.id} className="hover:bg-[#FCFAF6] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#FBF6EC] border border-[#F2E3C8] flex items-center justify-center text-[#A73710] flex-shrink-0 mt-0.5">
                          <Megaphone className="w-3.5 h-3.5" />
                        </span>
                        <p className="text-xs font-semibold text-slate-800">{a.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-slate-500 break-words max-w-md">{a.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={a.status} />
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {a.updated_at ? formatDate(a.updated_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => publishDraft(a)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Publish
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                          title="Edit announcement"
                        >
                          <Pencil className="w-3.5 h-3.5" />
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
                label="announcements"
              />
            )}
          </>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit announcement" : "New announcement"}
        size="lg"
      >
        <div className="space-y-3.5">
          <Field label="Title">
            <input
              className={inputClass}
              value={form.title}
              placeholder="Special darshan arrangements on Guru Purnima"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>

          <Field label="Message">
            <textarea
              className={`${inputClass} min-h-[110px] resize-y`}
              value={form.message}
              placeholder="Pilgrims are requested to…"
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            />
          </Field>

          <Field label="Status" hint="Drafts are hidden from pilgrims until published">
            <div className="flex gap-2">
              {(["draft", "published"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold capitalize transition-colors inline-flex items-center gap-1.5 ${
                    form.status === s
                      ? "border-[#A73710] bg-[#A73710] text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s === "published" && <Globe className="w-3.5 h-3.5" />}
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
