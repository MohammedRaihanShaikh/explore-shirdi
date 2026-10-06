"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  CheckCircle2,
  Menu,
  X,
  User,
  Mail,
  Phone,
  ShieldCheck,
  BadgeCheck,
  CalendarDays,
  Pencil,
} from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import ProfileEditor from "@/components/portal/ProfileEditor";
import PreferencesPanel from "@/components/portal/PreferencesPanel";
import { usePreferences } from "@/lib/i18n";
import type { UserProfile } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/** Read the cached user written at login, if any. */
function readCachedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem("shirdi_user");
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function formatMemberSince(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export default function PortalHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = usePreferences();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load user from localStorage on mount, then verify/refresh it against the
  // backend so the displayed name always comes from the authenticated user.
  useEffect(() => {
    const clearSession = () => {
      localStorage.removeItem("shirdi_access_token");
      localStorage.removeItem("shirdi_refresh_token");
      localStorage.removeItem("shirdi_user");
      setUser(null);
    };

    const loadUser = () => setUser(readCachedUser());

    const refreshFromServer = async () => {
      const token = localStorage.getItem("shirdi_access_token");
      if (!token) {
        setUser(null);
        return;
      }
      // Show the cached user instantly, then confirm it with the backend.
      setUser(readCachedUser());
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          // Token expired or invalid — drop the stale session.
          clearSession();
          window.dispatchEvent(new Event("shirdi_auth_change"));
          return;
        }
        if (!res.ok) return; // keep cached user on transient errors
        const profile = (await res.json()) as UserProfile;
        localStorage.setItem("shirdi_user", JSON.stringify(profile));
        setUser(profile);
      } catch {
        // Backend unreachable — keep showing the last known user.
      }
    };

    refreshFromServer();

    // Listen for storage events (login/logout from other tabs)
    window.addEventListener("storage", loadUser);
    // Custom event for same-tab updates
    window.addEventListener("shirdi_auth_change", loadUser);
    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("shirdi_auth_change", loadUser);
    };
  }, []);

  // Close the profile panel on outside click or Escape.
  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const navItems = [
    { id: "home", label: t("nav.home"), href: "/dashboard" },
    { id: "attractions", label: t("nav.attractions"), href: "/attractions" },
    { id: "darshan", label: t("nav.darshan"), href: "/darshan" },
    { id: "stays", label: t("nav.stays"), href: "/stays" },
    { id: "dining", label: t("nav.dining"), href: "/dining" },
    { id: "planner", label: t("nav.planner"), href: "/ai-planner" },
  ];

  const handleLogout = useCallback(() => {
    localStorage.removeItem("shirdi_access_token");
    localStorage.removeItem("shirdi_refresh_token");
    localStorage.removeItem("shirdi_user");
    setUser(null);
    setProfileOpen(false);
    setMobileMenuOpen(false);
    window.dispatchEvent(new Event("shirdi_auth_change"));
    router.push("/login");
  }, [router]);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const displayName = user?.full_name || t("account.guest");
  const isAdmin = user?.role === "admin";

  const roleLabel = user ? (isAdmin ? t("account.administrator") : t("account.pilgrim")) : t("account.guest");

  /** The account rows shown in the profile dropdown. */
  const detailRows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Mail className="w-3.5 h-3.5" />, label: t("account.email"), value: user?.email || "—" },
    { icon: <Phone className="w-3.5 h-3.5" />, label: t("account.phone"), value: user?.phone || "—" },
    {
      icon: <User className="w-3.5 h-3.5" />,
      label: t("account.devoteeType"),
      value: user?.devotee_type || "—",
    },
    {
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      label: t("account.memberSince"),
      value: formatMemberSince(user?.created_at),
    },
  ];

  return (
    <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link href="/dashboard" className="group flex-shrink-0">
          <BrandLogo />
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-[#A73710] text-white shadow-xs font-bold"
                    : "hover:text-[#A73710] hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Devotee account */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <PreferencesPanel />
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label="Account details"
              className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-slate-200 py-1 rounded-lg transition-colors hover:bg-slate-50"
            >
              {/* Avatar with initials */}
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#F59E0B]/50 bg-gradient-to-br from-amber-400 to-orange-600 flex-shrink-0 flex items-center justify-center">
                {user ? (
                  <span className="text-white text-[11px] font-bold">
                    {getInitials(user.full_name)}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] font-semibold text-amber-800 flex items-center gap-0.5">
                  {user ? (
                    isAdmin ? (
                      <ShieldCheck className="w-2.5 h-2.5 text-indigo-600 inline" />
                    ) : (
                      <CheckCircle2 className="w-2.5 h-2.5 text-amber-600 inline" />
                    )
                  ) : (
                    <User className="w-2.5 h-2.5 text-slate-400 inline" />
                  )}
                  <span>{roleLabel}</span>
                </span>
              </div>
            </button>

            {/* Account dropdown */}
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3.5 bg-gradient-to-br from-[#FCFAF6] to-white border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {user ? getInitials(user.full_name) : <User className="w-5 h-5" />}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isAdmin
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {user ? roleLabel : t("account.notSignedIn")}
                    </span>
                    {user && (
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          user.is_verified
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <BadgeCheck className="w-2.5 h-2.5" />
                        {user.is_verified ? t("account.verified") : t("account.unverified")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2">
                  {user ? (
                    <dl className="flex flex-col">
                      {detailRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-slate-400 mt-0.5 flex-shrink-0">
                            {row.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              {row.label}
                            </dt>
                            <dd className="text-xs font-semibold text-slate-800 break-words">
                              {row.value}
                            </dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="px-2.5 py-3 text-xs text-slate-500 leading-relaxed">
                      Sign in to see your pilgrim profile, bookings and Darshan passes.
                    </p>
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 flex flex-col gap-1">
                  {user ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          setEditorOpen(true);
                        }}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                        {t("account.editDetails")}
                      </button>
                      <Link
                        href={isAdmin ? "/admin/profile" : "/dashboard"}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {isAdmin ? t("account.myAdminProfile") : t("account.myProfile")}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        {t("account.signOut")}
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center justify-center gap-2 px-2.5 py-2.5 rounded-lg text-xs font-bold bg-[#A73710] hover:bg-[#8F2E0C] text-white transition-colors"
                    >
                      {t("account.signIn")}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 flex flex-col gap-2">
          {user && (
            <div className="mb-2 pb-2 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold">
                  {getInitials(user.full_name)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.full_name}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          )}
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/");
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold ${
                  isActive
                    ? "bg-[#A73710] text-white font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t("account.editDetails")}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("account.signOut")}
          </button>
        </div>
      )}

      {/* Edit-my-details sheet — mounted only while open so the form always
          starts from the current profile. */}
      {user && editorOpen && (
        <ProfileEditor
          user={user}
          onClose={() => setEditorOpen(false)}
          onSaved={(updated) => {
            setUser(updated);
            // Let other mounted components (darshan, stays, dining) refetch
            // anything keyed off the signed-in user.
            window.dispatchEvent(new Event("shirdi_auth_change"));
          }}
        />
      )}
    </header>
  );
}