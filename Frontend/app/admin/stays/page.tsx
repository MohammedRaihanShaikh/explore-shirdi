"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Eye, EyeOff, BedDouble } from "lucide-react";
import { api } from "@/lib/api";
import type { StayInput, StayItem } from "@/lib/api";
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
  formatMoney,
  getToken,
  inputClass,
  useToasts,
} from "@/components/admin/ui";

const EMPTY_FORM: StayInput = {
  id: "",
  name: "",
  description: "",
  location: "",
  distance: "",
  category: "",
  price_per_night: 0,
  total_rooms: 10,
  rating: 0,
  amenities: [],
  image: "/shirdi-sanctum.jpg",
  is_active: true,
};

export default function AdminStaysPage() {
  const { toasts, push, dismiss } = useToasts();

  const [items, setItems] = useState<StayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StayItem | null>(null);
  const [form, setForm] = useState<StayInput>(EMPTY_FORM);
  const [amenitiesText, setAmenitiesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setItems(await api.admin.stays(token));
    } catch (e) {
      setError(errorMessage(e, "Unable to load stays."));
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
    setAmenitiesText("");
    setOpen(true);
  };

  const openEdit = (s: StayItem) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description || "",
      location: s.location || "",
      distance: s.distance || "",
      category: s.category || "",
      price_per_night: s.price_per_night,
      total_rooms: s.total_rooms,
      rating: s.rating,
      amenities: s.amenities || [],
      image: s.image || "",
    });
    setAmenitiesText((s.amenities || []).join(", "));
    setOpen(true);
  };

  const save = async () => {
    const token = getToken();
    if (!token) return;

    if (!form.name || form.name.trim().length < 2) {
      push("Stay name must be at least 2 characters.", "error");
      return;
    }
    if (form.price_per_night < 0) {
      push("Price per night cannot be negative.", "error");
      return;
    }
    if (editing === null && !/^[a-z0-9][a-z0-9\-]*$/.test(form.id || "")) {
      push("Stay ID must be lowercase letters, numbers or hyphens.", "error");
      return;
    }

    const payload: StayInput = {
      ...form,
      amenities: amenitiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      if (editing) {
        await api.admin.updateStay(editing.id, payload, token);
        push(`Stay "${payload.name}" updated.`);
      } else {
        await api.admin.createStay(payload, token);
        push(`Stay "${payload.name}" created.`);
      }
      setOpen(false);
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not save stay."), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s: StayItem) => {
    const token = getToken();
    if (!token) return;
    setBusyId(s.id);
    try {
      await api.admin.setStayStatus(s.id, !s.is_active, token);
      push(s.is_active ? `"${s.name}" hidden from booking.` : `"${s.name}" is now bookable.`);
      await load();
    } catch (e) {
      push(errorMessage(e, "Could not change stay status."), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif font-bold text-slate-900">Stays</h2>
          <p className="text-xs text-slate-500">
            {items.length} stay{items.length === 1 ? "" : "s"} in the catalog · pricing is
            calculated server-side at booking time
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Add stay
        </Button>
      </div>

      <Card>
        {loading ? (
          <Loading label="Loading stays…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No stays yet"
            description="Add the first stay to make it bookable for pilgrims."
            action={<Button onClick={openCreate}>Add stay</Button>}
          />
        ) : (
          <Table
            headers={["Stay", "Location", "Price / night", "Rooms", "Rating", "Bookings", "Status", ""]}
          >
            {items.map((s) => (
              <tr key={s.id} className="hover:bg-[#FCFAF6] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs font-semibold text-slate-800">{s.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {s.category || s.id}
                    {s.amenities && s.amenities.length > 0 ? ` · ${s.amenities.length} amenities` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-600">{s.location || "—"}</td>
                <td className="px-4 py-3 text-xs font-bold text-slate-800 whitespace-nowrap tabular-nums">
                  {formatMoney(s.price_per_night)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">{s.total_rooms}</td>
                <td className="px-4 py-3 text-xs text-amber-700 tabular-nums">
                  ★ {s.rating.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">{s.booking_count}</td>
                <td className="px-4 py-3">
                  <Badge value={s.is_active ? "active" : "inactive"} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#A73710] hover:bg-[#FBF6EC]"
                      title="Edit stay"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(s)}
                      disabled={busyId === s.id}
                      className={`p-1.5 rounded-lg disabled:opacity-50 ${
                        s.is_active
                          ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                          : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                      }`}
                      title={s.is_active ? "Hide from booking" : "Enable booking"}
                    >
                      {s.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
        title={editing ? `Edit ${editing.name}` : "Add a stay"}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {!editing && (
            <Field label="Stay ID" hint="Lowercase slug, e.g. sai-ashram (immutable once created)">
              <input
                className={inputClass}
                value={form.id || ""}
                placeholder="sai-ashram"
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              />
            </Field>
          )}
          <Field label="Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Category">
            <input
              className={inputClass}
              value={form.category || ""}
              placeholder="Sansthan Trust Accommodation"
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </Field>
          <Field label="Location">
            <input
              className={inputClass}
              value={form.location || ""}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </Field>
          <Field label="Distance">
            <input
              className={inputClass}
              value={form.distance || ""}
              placeholder="0.1 km from Samadhi Mandir"
              onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))}
            />
          </Field>
          <Field label="Price per night (Rs.)">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.price_per_night}
              onChange={(e) =>
                setForm((f) => ({ ...f, price_per_night: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="Total rooms">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.total_rooms}
              onChange={(e) => setForm((f) => ({ ...f, total_rooms: Number(e.target.value) }))}
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
            <Field label="Amenities" hint="Comma separated">
              <input
                className={inputClass}
                value={amenitiesText}
                placeholder="Free Breakfast, AC Rooms, Temple Transfer"
                onChange={(e) => setAmenitiesText(e.target.value)}
              />
            </Field>
          </div>
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
            <Field label="Image path" hint="Static asset served by Next.js, e.g. /shirdi-sanctum.jpg">
              <input
                className={inputClass}
                value={form.image || ""}
                onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500 bg-[#FBF6EC] border border-[#F2E3C8] rounded-xl px-3 py-2">
          <BedDouble className="w-3.5 h-3.5 text-[#B45309] mt-0.5 flex-shrink-0" />
          Changing the price affects future bookings only. Existing bookings keep the total that
          was calculated when they were made.
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create stay"}
          </Button>
        </div>
      </Modal>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
