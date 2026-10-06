"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Eye, EyeOff, MapPin, Clock, Navigation, Star } from "lucide-react";
import { api } from "@/lib/api";
import type { PlaceInput, PlaceItem } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Modal,
  Table,
  TableEmpty,
  ToastStack,
  errorMessage,
  getToken,
  inputClass,
  useToasts,
} from "@/components/admin/ui";

const EMPTY_FORM: PlaceInput = {
  slug: "",
  title: "",
  category: "Temple",
  description: "",
  distance: "",
  duration: "",
  rating: 0,
  image: "/shirdi-sanctum.jpg",
};

export default function AdminPlacesPage() {
  const { toasts, push, dismiss } = useToasts();

  const [items, setItems] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlaceItem | null>(null);
  const [form, setForm] = useState<PlaceInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setItems(await api.admin.places(token));
    } catch (e) {
      setError(errorMessage(e, "Unable to load places."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (p: PlaceItem) => {
    setEditing(p);
    setForm({
      title: p.title,
      category: p.category,
      description: p.description || "",
      distance: p.distance || "",
      duration: p.duration || "",
      rating: p.rating,
      image: p.image || "",
    });
    setOpen(true);
  };

  const save = async () => {
    const token = getToken();
    if (!token) return;

    if (!form.title || form.title.trim().length < 2) {
      push("Title must be at least 2 characters.", "error");
      return;
    }
    if (!form.category || form.category.trim().length < 2) {
      push("Category must be at least 2 characters.", "error");
      return;
    }
    if (editing === null && !/^[a-z0-9][a-z0-9\-]*$/.test(form.slug || "")) {
      push("Slug must be lowercase letters, numbers or hyphens.", "error");
      return;
    }
    if (form.rating < 0 || form.rating > 5) {
      push("Rating must be between 0 and 5.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.admin.updatePlace(editing.id, form, token);
        push(`"${form.title}" updated.`);
      } else {
        await api.admin.createPlace(form, token);
        push(`"${form.title}" created.`);
      }
      setOpen(false);
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not save place."), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p: PlaceItem) => {
    const token = getToken();
    if (!token) return;
    setBusyId(p.id);
    try {
      await api.admin.setPlaceStatus(p.id, !p.is_active, token);
      push(p.is_active ? `"${p.title}" unpublished.` : `"${p.title}" published.`);
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not change place status."), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Sacred Places</h2>
          <p className="text-xs text-slate-500">
            {items.length} place{items.length === 1 ? "" : "s"} · published places are returned by{" "}
            <span className="font-mono text-[11px] text-slate-600">GET /api/places</span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Add place
        </Button>
      </div>

      <Card>
        {loading ? (
          <Loading label="Loading places…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No places yet"
            description="Add the first sacred place so pilgrims can discover it."
            action={<Button onClick={openCreate}>Add place</Button>}
          />
        ) : (
          <Table headers={["Place", "Category", "Distance", "Duration", "Rating", "Status", ""]}>
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-[#FCFAF6] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#FBF6EC] border border-[#F2E3C8] flex items-center justify-center text-[#A73710] flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{p.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">/{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge value={p.category} />
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-slate-400" />
                    {p.distance || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {p.duration || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap tabular-nums">
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                    <Star className="w-3 h-3 fill-current" />
                    {p.rating.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge value={p.is_active ? "published" : "draft"} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                      title="Edit place"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      disabled={busyId === p.id}
                      className={`p-1.5 rounded-lg disabled:opacity-50 ${
                        p.is_active
                          ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                          : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                      }`}
                      title={p.is_active ? "Unpublish" : "Publish"}
                    >
                      {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.title}` : "Add a sacred place"}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {!editing && (
            <Field label="Slug" hint="Lowercase URL id, e.g. samadhi-mandir (immutable)">
              <input
                className={inputClass}
                value={form.slug || ""}
                placeholder="samadhi-mandir"
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </Field>
          )}
          <Field label="Title">
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <Field label="Category" hint="Temple, Heritage, Nature…">
            <input
              className={inputClass}
              value={form.category}
              placeholder="Temple"
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </Field>
          <Field label="Distance">
            <input
              className={inputClass}
              value={form.distance || ""}
              placeholder="1 km from Samadhi Mandir"
              onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))}
            />
          </Field>
          <Field label="Duration">
            <input
              className={inputClass}
              value={form.duration || ""}
              placeholder="45 min visit"
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
            />
          </Field>
          <Field label="Rating (0–5)">
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              className={inputClass}
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Image path" hint="Static asset, e.g. /shirdi-sanctum.jpg">
              <input
                className={inputClass}
                value={form.image || ""}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create place"}
          </Button>
        </div>
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
