"use client";

/**
 * AuthContext — global auth state for Explore Shirdi.
 *
 * Wraps the whole app so any component can call `useAuth()` to get:
 *   - user        : UserProfile | null  — currently signed-in user
 *   - token       : string | null       — JWT access token
 *   - isLoading   : boolean             — true while the initial check runs
 *   - login()     : store tokens + user after a successful /auth/login call
 *   - logout()    : clear everything and redirect to /login
 *   - refreshUser(): re-fetch /auth/me and update state
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

interface LoginPayload {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

// ─── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─── Helpers ──────────────────────────────────────────────────

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / SSR errors
  }
}

function clearStorage() {
  try {
    localStorage.removeItem("shirdi_access_token");
    localStorage.removeItem("shirdi_refresh_token");
    localStorage.removeItem("shirdi_user");
  } catch {
    // Ignore
  }
}

// ─── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: hydrate from localStorage then verify against backend
  useEffect(() => {
    const storedToken = localStorage.getItem("shirdi_access_token");
    const storedUser = readStorage<UserProfile>("shirdi_user");

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    // Show cached user immediately (no flicker)
    setToken(storedToken);
    setUser(storedUser);

    // Verify token is still valid with the backend
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          // Token expired — clear everything
          clearStorage();
          setUser(null);
          setToken(null);
          return;
        }
        if (!res.ok) return; // keep cached on transient errors
        const profile = (await res.json()) as UserProfile;
        writeStorage("shirdi_user", profile);
        setUser(profile);
      })
      .catch(() => {
        // Backend unreachable — keep showing cached user
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for auth changes from other tabs / same-tab custom events
  useEffect(() => {
    const sync = () => {
      const t = localStorage.getItem("shirdi_access_token");
      const u = readStorage<UserProfile>("shirdi_user");
      setToken(t);
      setUser(u);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("shirdi_auth_change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("shirdi_auth_change", sync);
    };
  }, []);

  // Called immediately after a successful /auth/login response
  const login = useCallback((payload: LoginPayload) => {
    localStorage.setItem("shirdi_access_token", payload.access_token);
    localStorage.setItem("shirdi_refresh_token", payload.refresh_token);
    writeStorage("shirdi_user", payload.user);
    setToken(payload.access_token);
    setUser(payload.user);
    window.dispatchEvent(new Event("shirdi_auth_change"));
  }, []);

  // Clear session and redirect to login
  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
    setToken(null);
    window.dispatchEvent(new Event("shirdi_auth_change"));
    router.push("/login");
  }, [router]);

  // Re-fetch /auth/me to get fresh profile data
  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem("shirdi_access_token");
    if (!t) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return;
      const profile = (await res.json()) as UserProfile;
      writeStorage("shirdi_user", profile);
      setUser(profile);
    } catch {
      // Silently ignore network errors
    }
  }, []);

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout, refreshUser, setUser }),
    [user, token, isLoading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
