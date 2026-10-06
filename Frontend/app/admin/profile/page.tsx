"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  Bell,
  MessageSquare,
  Pencil,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { UserProfile } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Loading,
  ToastStack,
  errorMessage,
  formatDate,
  getToken,
  inputClass,
  useToasts,
} from "@/components/admin/ui";

const PASSWORD_RULE = "Minimum 8 characters with upper, lower, number and special character.";

export default function AdminProfilePage() {
  const { toasts, push, dismiss } = useToasts();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", devotee_type: "General Devotee" });
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const me = await api.auth.me(token);
      setProfile(me);
      setForm({
        full_name: me.full_name,
        phone: me.phone || "",
        devotee_type: me.devotee_type,
      });
    } catch (e) {
      setError(errorMessage(e, "Unable to load your profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async () => {
    const token = getToken();
    if (!token) return;
    if (form.full_name.trim().length < 2) {
      push("Name must be at least 2 characters.", "error");
      return;
    }
    if (form.phone && !/^\+?[0-9]{10,15}$/.test(form.phone.trim())) {
      push("Phone must be 10–15 digits, optionally starting with +.", "error");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.auth.updateMe(
        {
          full_name: form.full_name.trim(),
          phone: form.phone.trim() ? form.phone.trim() : undefined,
          devotee_type: form.devotee_type,
        },
        token
      );
      setProfile(updated);
      localStorage.setItem("shirdi_user", JSON.stringify(updated));
      push("Profile updated.");
      setEditing(false);
    } catch (e) {
      push(errorMessage(e, "Could not update profile."), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (key: "whatsapp_alerts" | "sms_alerts") => {
    const token = getToken();
    if (!token || !profile) return;
    // Optimistic toggle — reverts automatically if the API call fails.
    const next = !profile[key];
    setProfile({ ...profile, [key]: next });
    try {
      const updated = await api.auth.updateMe({ [key]: next }, token);
      setProfile(updated);
      localStorage.setItem("shirdi_user", JSON.stringify(updated));
    } catch (e) {
      setProfile({ ...profile, [key]: !next });
      push(errorMessage(e, "Could not update alert preference."), "error");
    }
  };

  const changePassword = async () => {
    const token = getToken();
    if (!token) return;
    if (pw.new_password.length < 8) {
      push("New password must be at least 8 characters.", "error");
      return;
    }
    setPwSaving(true);
    try {
      await api.auth.changePassword(
        { current_password: pw.current_password, new_password: pw.new_password },
        token
      );
      push("Password changed successfully.");
      setPw({ current_password: "", new_password: "" });
    } catch (e) {
      push(errorMessage(e, "Could not change password."), "error");
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <Loading label="Loading your profile…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!profile) return <ErrorState message="Profile unavailable." onRetry={load} />;

  const initials = profile.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-3xl space-y-5">
      {/* Identity card */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#A73710] via-[#C2410C] to-[#F59E0B]" />
        <div className="px-5 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-3 -mt-8">
            <div className="flex items-end gap-3">
              <span className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center">
                <span className="text-xl font-serif font-black text-[#A73710]">{initials}</span>
              </span>
              <div className="pb-1">
                <h2 className="text-lg font-serif font-bold text-slate-900">{profile.full_name}</h2>
                <p className="text-xs text-slate-500">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Badge value={profile.role || "admin"} />
              <Badge value={profile.is_active ? "active" : "inactive"} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { icon: User, label: "Devotee type", value: profile.devotee_type },
              { icon: ShieldCheck, label: "Verified", value: profile.is_verified ? "Yes" : "No" },
              { icon: Phone, label: "Phone", value: profile.phone || "—" },
              { icon: Mail, label: "Member since", value: formatDate(profile.created_at) },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.label}
                  className="rounded-xl bg-[#FCFAF6] border border-slate-100 px-3 py-2.5"
                >
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <Icon className="w-3 h-3" /> {f.label}
                  </p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 break-words">{f.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Edit profile */}
        <Card>
          <CardHeader
            title="Profile Details"
            description="Your public pilgrim profile"
            action={
              !editing ? (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              ) : undefined
            }
          />
          <div className="px-5 py-4 space-y-3.5">
            {editing ? (
              <>
                <Field label="Full name">
                  <input
                    className={inputClass}
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </Field>
                <Field label="Phone" hint="10–15 digits, optionally starting with +">
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
                  <Button variant="secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveProfile} disabled={saving}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </>
            ) : (
              <dl className="space-y-2.5">
                {[
                  ["Full name", profile.full_name],
                  ["Email", profile.email],
                  ["Phone", profile.phone || "—"],
                  ["Devotee type", profile.devotee_type],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[#FCFAF6] border border-slate-100 px-3 py-2.5"
                  >
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {k}
                    </dt>
                    <dd className="text-xs font-semibold text-slate-800 text-right break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-5">
          {/* Alert preferences */}
          <Card>
            <CardHeader title="Alert Preferences" description="How pilgrims' alerts reach you" />
            <div className="px-5 py-4 space-y-2.5">
              {(
                [
                  {
                    key: "whatsapp_alerts" as const,
                    icon: MessageSquare,
                    label: "WhatsApp alerts",
                    hint: "Aarti reminders and booking updates",
                  },
                  {
                    key: "sms_alerts" as const,
                    icon: Bell,
                    label: "SMS alerts",
                    hint: "Queue and darshan notifications",
                  },
                ]
              ).map((row) => {
                const Icon = row.icon;
                const on = profile[row.key];
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => toggleAlert(row.key)}
                    className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                        on
                          ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                          : "bg-slate-50 border-slate-200 text-slate-400"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-slate-800">{row.label}</span>
                      <span className="block text-[10px] text-slate-500">{row.hint}</span>
                    </span>
                    <span
                      className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${
                        on ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          on ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Change password */}
          <Card>
            <CardHeader title="Change Password" description="Keep your admin account secure" />
            <div className="px-5 py-4 space-y-3.5">
              <Field label="Current password">
                <input
                  type="password"
                  className={inputClass}
                  value={pw.current_password}
                  onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))}
                />
              </Field>
              <Field label="New password" hint={PASSWORD_RULE}>
                <input
                  type="password"
                  className={inputClass}
                  value={pw.new_password}
                  onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))}
                />
              </Field>
              {pw.new_password.length > 0 && (
                <div className="flex items-start gap-2 text-[11px]">
                  {PASSWORD_RULE.split(", ").every((rule) => {
                    if (rule.includes("8")) return pw.new_password.length >= 8;
                    if (rule.includes("upper")) return /[A-Z]/.test(pw.new_password);
                    if (rule.includes("lower")) return /[a-z]/.test(pw.new_password);
                    if (rule.includes("number")) return /[0-9]/.test(pw.new_password);
                    if (rule.includes("special")) return /[^A-Za-z0-9]/.test(pw.new_password);
                    return true;
                  }) ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-emerald-700 font-semibold">
                        Password meets all requirements.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-500">
                        Needs upper, lower, number and special character.
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className="flex justify-end pt-1">
                <Button
                  onClick={changePassword}
                  disabled={pwSaving || !pw.current_password || !pw.new_password}
                >
                  {pwSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  {pwSaving ? "Changing…" : "Change password"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        Your role and account status are managed by the system and cannot be changed from this page.
      </p>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
