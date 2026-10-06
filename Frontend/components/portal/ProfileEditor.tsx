"use client";

/**
 * Edit-my-details sheet, opened from the account dropdown in PortalHeader.
 *
 * Edits exactly the fields the backend accepts on `PATCH /api/auth/me`:
 * full name, email, phone, devotee type and the two alert preferences.
 * Role, verification and active status are server-owned, so they are shown
 * read-only rather than offered as editable inputs.
 */
import React, { useEffect, useState } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  User,
  ShieldCheck,
  Bell,
} from "lucide-react";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { api, formatApiError } from "@/lib/api";
import type { UserProfile } from "@/lib/api";

/** Mirrors the DevoteeType enum on the backend model. */
const DEVOTEE_TYPES = [
  "General Devotee",
  "Senior Citizen (60+)",
  "Family with Kids",
  "Overseas / NRI",
  "First Time Visitor",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{10,15}$/;

interface ProfileEditorProps {
  user: UserProfile;
  onClose: () => void;
  /** Receives the freshly-saved profile so the header can refresh. */
  onSaved: (user: UserProfile) => void;
}

/**
 * Mounted only while open (see PortalHeader), so the form starts from the
 * current profile every time and a cancelled edit leaves nothing behind.
 */
export default function ProfileEditor({
  user,
  onClose,
  onSaved,
}: ProfileEditorProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [devoteeType, setDevoteeType] = useState(user.devotee_type);
  const [whatsapp, setWhatsapp] = useState(!!user.whatsapp_alerts);
  const [sms, setSms] = useState(!!user.sms_alerts);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Escape closes, and the page behind must not scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [saving, onClose]);

  const validate = (): string => {
    if (fullName.trim().length < 2) return "Name must be at least 2 characters.";
    if (!EMAIL_RE.test(email.trim())) return "Please enter a valid email address.";
    if (phone.trim() && !PHONE_RE.test(phone.trim()))
      return "Phone must be 10–15 digits, optionally starting with +.";
    return "";
  };

  const save = async () => {
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    setSaving(true);
    try {
      const updated = await api.auth.updateMe(
        {
          full_name: fullName.trim(),
          email: trimmedEmail,
          // An empty phone clears the column rather than being sent as "".
          ...(trimmedPhone ? { phone: trimmedPhone } : {}),
          devotee_type: devoteeType,
          whatsapp_alerts: whatsapp,
          sms_alerts: sms,
        },
        token
      );

      // Keep the cached session profile in step so a reload shows the new
      // details without waiting for another /auth/me round trip.
      localStorage.setItem("shirdi_user", JSON.stringify(updated));
      onSaved(updated);

      const emailChanged = trimmedEmail !== (user.email || "").toLowerCase();
      setSuccess(
        emailChanged
          ? "Details saved. Use your new email to sign in next time."
          : "Your details have been updated."
      );
    } catch (e) {
      setError(formatApiError(e, "Could not save your details."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit your details"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl">
          <div>
            <h2 className="text-base font-serif font-bold text-slate-900">
              Edit your details
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Keep your contact details current for Darshan alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          <div className="flex flex-col gap-3.5">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                <User className="w-3 h-3 inline mr-1" />
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={150}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30 focus:border-[#A73710]/40"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                <Mail className="w-3 h-3 inline mr-1" />
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30 focus:border-[#A73710]/40"
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                This is also your sign-in ID. Changing it resets your verified
                badge until the new address is confirmed.
              </p>
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                <Phone className="w-3 h-3 inline mr-1" />
                Phone number
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#A73710]/30 focus:border-[#A73710]/40"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                10–15 digits, optionally starting with +. Leave blank to remove.
              </p>
            </div>

            <div>
              <label
                htmlFor="profile-devotee"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Devotee type
              </label>
              <select
                id="profile-devotee"
                value={devoteeType}
                onChange={(e) => setDevoteeType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/30 focus:border-[#A73710]/40"
              >
                {DEVOTEE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#FCFAF6] p-3">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-2.5">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                Aarti reminders
              </p>
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="text-[11px] text-slate-600">WhatsApp alerts</span>
                <ToggleSwitch
                  enabled={whatsapp}
                  onChange={setWhatsapp}
                  activeColor="bg-[#A73710]"
                />
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="text-[11px] text-slate-600">SMS alerts</span>
                <ToggleSwitch enabled={sms} onChange={setSms} activeColor="bg-[#A73710]" />
              </div>
            </div>

            {/* Server-owned fields — shown so the user knows the state. */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Managed by the trust
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[9px]">
                    Role
                  </p>
                  <p className="text-slate-700 font-semibold capitalize">
                    {user.role || "user"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[9px]">
                    Verified
                  </p>
                  <p className="text-slate-700 font-semibold">
                    {user.is_verified ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-white hover:bg-amber-50 text-[#A73710] font-bold py-2.5 rounded-xl text-sm border border-[#E7D6A7] transition-colors disabled:opacity-60"
            >
              {success ? "Done" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 bg-[#A73710] hover:bg-[#8F2E0C] text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}