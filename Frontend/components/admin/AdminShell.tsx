"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  BedDouble,
  MapPin,
  Sparkles,
  MessageSquare,
  Bell,
  Megaphone,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  CreditCard,
  Receipt,
} from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface AdminSession {
  id: number;
  full_name: string;
  email: string;
  role: string;
  created_at?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MANAGEMENT: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/stays", label: "Stays", icon: BedDouble },
  { href: "/admin/places", label: "Places", icon: MapPin },
  { href: "/admin/darshan", label: "Darshan", icon: Sparkles },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/payments", label: "Payment Details", icon: CreditCard },
];

const COMMUNICATION: NavItem[] = [
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

const SYSTEM: NavItem[] = [
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/profile", label: "Profile", icon: UserCog },
];

/** Human-readable top-bar title per route (avoids a prop on every page). */
const ROUTE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/dashboard": "Dashboard",
  "/admin/users": "User Management",
  "/admin/bookings": "Booking Management",
  "/admin/stays": "Stay Management",
  "/admin/places": "Place Management",
  "/admin/darshan": "Darshan Management",
  "/admin/feedback": "Feedback",
  "/admin/notifications": "Notifications",
  "/admin/announcements": "Announcements",
  "/admin/analytics": "Analytics",
  "/admin/profile": "Administrator Profile",
  "/admin/payments": "Payment Details",
};

function clearSession() {
  localStorage.removeItem("shirdi_access_token");
  localStorage.removeItem("shirdi_refresh_token");
  localStorage.removeItem("shirdi_user");
}

export default function AdminShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem("shirdi_access_token");
    if (!token) {
      setState("denied");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        clearSession();
        setState("denied");
        return;
      }
      if (!res.ok) {
        setState("denied");
        return;
      }
      const profile = (await res.json()) as AdminSession;
      // The UI honours the role the API returned. The backend independently
      // re-checks it on every /api/admin/* call, so this is display-only.
      if (profile.role !== "admin") {
        setState("denied");
        return;
      }
      localStorage.setItem("shirdi_user", JSON.stringify(profile));
      setSession(profile);
      setState("ready");
    } catch {
      setState("denied");
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearSession();
    window.dispatchEvent(new Event("shirdi_auth_change"));
    router.push("/login");
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-[#A73710]" />
          <p className="text-xs font-semibold">Verifying administrator access…</p>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-lg font-serif font-bold text-slate-900 mb-2">
            Administrator access required
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            This area is restricted to authorised Explore Shirdi administrators.
            Sign in with an administrator account to continue.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl bg-[#A73710] hover:bg-[#8F2E0C] text-white text-xs font-semibold transition-colors"
            >
              Sign in as administrator
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              Back to pilgrim portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      <div>
        <Link
          href="/admin/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
            pathname === "/admin/dashboard"
              ? "bg-[#A73710] text-white shadow-sm"
              : "text-slate-600 hover:bg-[#FBF6EC]"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      {[
        { label: "Management", items: MANAGEMENT },
        { label: "Communication", items: COMMUNICATION },
        { label: "System", items: SYSTEM },
      ].map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-1.5 text-[10px] font-bold tracking-[0.14em] text-[#B45309] uppercase">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? "bg-[#A73710] text-white shadow-sm"
                      : "text-slate-600 hover:bg-[#FBF6EC]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const brand = (
    <div className="px-5 py-5 border-b border-slate-200">
      <Link href="/admin/dashboard" className="group block">
        <BrandLogo size="sm" subtitle="Admin Panel" />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-800">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex-col z-30">
        {brand}
        {nav}
        <div className="border-t border-slate-200 p-3 space-y-0.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Pilgrim Portal
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-white flex flex-col shadow-2xl">
            <button
              type="button"
              className="absolute top-4 right-3 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {brand}
            {nav}
            <div className="border-t border-slate-200 p-3 space-y-0.5">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Pilgrim Portal
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-serif font-bold text-slate-900 truncate">
                  {title || ROUTE_TITLES[pathname] || "Admin Panel"}
                </h1>
                <p className="text-[11px] text-slate-500 truncate">
                  {subtitle || "Explore Shirdi Administration"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-[#A73710] flex items-center justify-center">
                  <span className="text-white text-[11px] font-bold">
                    {(session?.full_name || "A")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                    {session?.full_name}
                  </p>
                  <p className="text-[10px] font-semibold text-[#B45309] uppercase tracking-wide">
                    Administrator
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
