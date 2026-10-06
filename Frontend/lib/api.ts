/**
 * Explore Shirdi — Typed API Client
 * Connects the Next.js frontend to the FastAPI backend.
 * All requests auto-attach the JWT token if logged in.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─── Response & Request Types ────────────────────────────────

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  /** Server-assigned authorization role. Clients can never set this value. */
  role?: "user" | "admin";
  devotee_type: string;
  is_active: boolean;
  is_verified: boolean;
  whatsapp_alerts: boolean;
  sms_alerts: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  devotee_type?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface DarshanPassRequest {
  pass_type: "general" | "vip" | "senior_wheelchair" | "abhishek_puja";
  visit_date: string;
  num_devotees: number;
  gate_number?: number;
}

export interface DarshanPassResponse {
  id: number;
  pass_type: string;
  visit_date: string;
  num_devotees: number;
  status: string;
  booking_ref: string;
  price_paid: number;
  gate_number?: number;
  created_at: string;
}

export interface StayBookingRequest {
  stay_id: string;
  stay_name: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  num_rooms: number;
  total_price: number;
  special_requests?: string;
}

export interface StayBookingResponse {
  id: number;
  stay_id: string;
  stay_name: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  num_rooms: number;
  total_price: number;
  status: string;
  booking_ref: string;
  special_requests?: string;
  created_at: string;
}

export interface UserProfileUpdate {
  full_name?: string;
  email?: string;
  phone?: string;
  devotee_type?: string;
  whatsapp_alerts?: boolean;
  sms_alerts?: boolean;
}

export interface ItineraryRequest {
  duration: string;
  devotee_type: string;
  include_stays: boolean;
  include_meals: boolean;
  include_transport: boolean;
}

export interface ReminderRequest {
  aarti_name: string;
  remind_minutes_before: number;
  via_whatsapp: boolean;
  via_sms: boolean;
}

// ─── Admin & Content Types ────────────────────────────────────

export type AdminRole = "user" | "admin";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: AdminRole;
  devotee_type: string;
  is_active: boolean;
  is_verified: boolean;
  whatsapp_alerts: boolean;
  sms_alerts: boolean;
  booking_count: number;
  darshan_count: number;
  created_at: string;
}

export interface AdminBooking {
  id: number;
  booking_ref: string;
  user_id: number;
  user_name: string;
  user_email: string;
  stay_id: string;
  stay_name: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  num_rooms: number;
  total_price: number;
  status: BookingStatusValue;
  special_requests?: string | null;
  created_at: string;
  // Payment details (from payments table)
  payment_status?: string | null;
  payment_method?: string | null;
  utr?: string | null;
  paid_at?: string | null;
}

export type BookingStatusValue = "pending" | "confirmed" | "cancelled" | "completed";

export interface AdminDarshan {
  id: number;
  booking_ref: string;
  user_id: number;
  user_name: string;
  user_email: string;
  pass_type: string;
  visit_date: string;
  num_devotees: number;
  status: BookingStatusValue;
  price_paid: number;
  gate_number?: number | null;
  created_at: string;
}

export interface AdminPayment {
  id: number;
  entity_type: "stay" | "dining" | "darshan";
  entity_id: number;
  booking_ref: string;
  user_id: number;
  user_name: string;
  user_email: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed" | "refunded";
  payment_method?: "razorpay" | "upi" | null;
  utr?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  created_at: string;
  updated_at?: string | null;
  paid_at?: string | null;
  special_requests?: string | null;
}

export interface StayItem {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  distance?: string | null;
  category?: string | null;
  price_per_night: number;
  total_rooms: number;
  rating: number;
  amenities?: string[] | null;
  image?: string | null;
  is_active: boolean;
  booking_count: number;
  created_at?: string | null;
}

export interface PlaceItem {
  id: number;
  slug: string;
  title: string;
  category: string;
  description?: string | null;
  distance?: string | null;
  duration?: string | null;
  rating: number;
  image?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface StayCatalogItem {
  id: string;
  name: string;
  price_per_night: number;
  location?: string | null;
  distance?: string | null;
  category?: string | null;
  description?: string | null;
  image?: string | null;
  rating: number;
  total_rooms: number;
  amenities?: string[] | null;
}

export interface FeedbackItem {
  id: number;
  rating: number;
  comment: string;
  status: "new" | "reviewed" | "resolved";
  user_id?: number | null;
  user_name: string;
  user_email?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  audience: "all" | "users" | "admins";
  status: "published" | "draft";
  created_at: string;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  message: string;
  status: "published" | "draft";
  created_at: string;
  updated_at?: string | null;
}

export interface RecentActivity {
  type: string;
  title: string;
  detail: string;
  at: string;
}

export interface AdminDashboard {
  total_users: number;
  new_users_7d: number;
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  completed_bookings: number;
  booking_revenue: number;
  total_stays: number;
  active_stays: number;
  total_places: number;
  active_places: number;
  total_darshan_passes: number;
  upcoming_darshan_passes: number;
  cancelled_darshan_passes: number;
  total_feedback: number;
  average_rating: number | null;
  total_itineraries: number;
  total_reminders: number;
  active_reminders: number;
  recent_activity: RecentActivity[];
}

export interface AdminAnalytics {
  users: {
    total: number;
    new_last_7_days: number;
    new_last_30_days: number;
    admins: number;
    active: number;
    by_month: { month: string; count: number }[];
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    revenue: number;
    by_month: { month: string; count: number }[];
    popular_stays: { stay_id: string; stay_name: string; bookings: number }[];
  };
  stays: { total: number; active: number; inactive: number };
  darshan: {
    total: number;
    upcoming: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    by_type: { type: string; count: number }[];
  };
  feedback: {
    total: number;
    average_rating: number | null;
    rating_distribution: { rating: string; count: number }[];
    pending_review: number;
  };
  content: {
    places: number;
    announcements: number;
    published_announcements: number;
    notifications: number;
    itineraries: number;
    active_reminders: number;
  };
}

export interface AdminUserUpdate {
  full_name?: string;
  phone?: string | null;
  devotee_type?: string;
  is_verified?: boolean;
  whatsapp_alerts?: boolean;
  sms_alerts?: boolean;
}

export interface StayInput {
  id?: string;
  name: string;
  description?: string;
  location?: string;
  distance?: string;
  category?: string;
  price_per_night: number;
  total_rooms: number;
  rating: number;
  amenities?: string[];
  image?: string;
  is_active?: boolean;
}

export interface PlaceInput {
  slug?: string;
  title: string;
  category: string;
  description?: string;
  distance?: string;
  duration?: string;
  rating: number;
  image?: string;
  is_active?: boolean;
}

// ─── Payment Types (Razorpay) ─────────────────────────────

export interface PaymentOrder {
  order_id: string;
  amount: number; // INR
  currency: string;
  key_id: string; // Razorpay key id for the Checkout SDK
  mock: boolean; // true when running without real Razorpay keys
  receipt: string;
  /** UPI QR flow: the intent URL to encode as a QR code. */
  upi_intent?: string;
  /** UPI QR flow: the merchant's UPI payment address. */
  upi_id?: string;
}

export interface BookingWithPayment {
  booking: StayBookingResponse;
  payment: PaymentOrder;
}

export interface DarshanPassWithPayment {
  pass: DarshanPassResponse;
  payment: PaymentOrder;
}

export interface PaymentVerifyResult {
  success: boolean;
  message: string;
  entity_type: string;
  entity_id: number;
  booking_ref: string;
  status: string;
}

// ─── Core Fetch Wrapper ───────────────────────────────────────

/**
 * Turn any backend error payload into a human-readable message.
 * FastAPI returns `detail` as a string (HTTPException) or as an array of
 * validation objects (422) — both must render nicely in the UI.
 */
export function formatApiError(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((item) => {
          if (typeof item === "string") return item;
          const obj = item as { msg?: string; loc?: (string | number)[] };
          const loc = Array.isArray(obj.loc) ? obj.loc : [];
          const field = loc.length > 1 ? String(loc[loc.length - 1]) : "";
          const msg = obj.msg || "is invalid";
          return field && field.toLowerCase() !== "body"
            ? `${field} ${msg.toLowerCase()}`
            : msg;
        })
        .join(" ");
    }
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(
      formatApiError(data, `Request failed: ${res.status} ${res.statusText}`)
    );
  }

  return data as T;
}

// ─── Token Storage ────────────────────────────────────────────

export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("shirdi_access_token");
  },
  save: (token: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem("shirdi_access_token", token);
    }
  },
  saveTokenResponse: (response: TokenResponse): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem("shirdi_access_token", response.access_token);
      localStorage.setItem("shirdi_refresh_token", response.refresh_token);
      localStorage.setItem("shirdi_user", JSON.stringify(response.user));
    }
  },
  getUser: (): UserProfile | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("shirdi_user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("shirdi_access_token");
      localStorage.removeItem("shirdi_refresh_token");
      localStorage.removeItem("shirdi_user");
    }
  },
};

// ─── API Namespaces ────────────────────────────────────────────

/**
 * Build a query string, dropping empty values so URLs stay clean.
 * Used for admin search / filter / pagination — all of which are server-side.
 */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
}

export const api = {
  // Authentication
  auth: {
    register: (data: RegisterRequest) =>
      request<TokenResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    login: (data: LoginRequest) =>
      request<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    me: (token: string) => request<UserProfile>("/auth/me", {}, token),

    updateMe: (data: UserProfileUpdate, token: string) =>
      request<UserProfile>(
        "/auth/me",
        { method: "PATCH", body: JSON.stringify(data) },
        token
      ),

    changePassword: (
      data: { current_password: string; new_password: string },
      token: string
    ) =>
      request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }, token),

    refresh: (refresh_token: string) =>
      request<TokenResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token }),
      }),
  },

  // Darshan Passes
  darshan: {
    book: (data: DarshanPassRequest, token: string) =>
      request<DarshanPassWithPayment>(
        "/darshan/book",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),

    myPasses: (token: string) =>
      request<DarshanPassResponse[]>("/darshan/my-passes", {}, token),

    cancel: (passId: number, token: string) =>
      request(`/darshan/${passId}`, { method: "DELETE" }, token),
  },

  // Stay Bookings
  stays: {
    catalog: () => request<StayCatalogItem[]>("/stays/catalog"),

    book: (data: StayBookingRequest, token: string) =>
      request<BookingWithPayment>(
        "/stays/book",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),

    myBookings: (token: string) =>
      request<StayBookingResponse[]>("/stays/my-bookings", {}, token),

    cancel: (bookingId: number, token: string) =>
      request(`/stays/${bookingId}`, { method: "DELETE" }, token),
  },

  // AI Itinerary
  itinerary: {
    generate: (data: ItineraryRequest, token: string) =>
      request<unknown>(
        "/itinerary/generate",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),

    saved: (token: string) => request<unknown[]>("/itinerary/saved", {}, token),

    save: (itineraryId: number, token: string) =>
      request(`/itinerary/save/${itineraryId}`, { method: "POST" }, token),
  },

  // Live Data (REST fallback)
  live: {
    dashboard: () => request<unknown>("/live/dashboard"),
    queue: () => request<unknown[]>("/live/queue"),
    weather: () => request<unknown>("/live/weather"),
    aarti: () => request<unknown[]>("/live/aarti"),
  },

  // Aarti Reminders
  reminders: {
    enable: (data: ReminderRequest, token: string) =>
      request(
        "/reminders/enable",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),

    list: (token: string) => request<unknown[]>("/reminders/", {}, token),

    disable: (reminderId: number, token: string) =>
      request(`/reminders/${reminderId}`, { method: "DELETE" }, token),
  },

  // Public / pilgrim-facing content
  content: {
    places: () => request<PlaceItem[]>("/places"),
    announcements: () => request<AnnouncementItem[]>("/announcements"),
    notifications: (token: string) =>
      request<NotificationItem[]>("/notifications", {}, token),
    submitFeedback: (
      data: { rating: number; comment: string },
      token: string
    ) =>
      request<FeedbackItem>(
        "/feedback",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),
    myFeedback: (token: string) => request<FeedbackItem[]>("/feedback/mine", {}, token),
  },

  // Payments (Razorpay)
  payments: {
    /**
     * Verify a completed Razorpay payment and confirm the booking.
     * The backend re-computes the HMAC signature before confirming.
     */
    verify: (
      data: {
        entity_type: "stay" | "darshan";
        entity_id: number;
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      },
      token: string
    ) =>
      request<PaymentVerifyResult>(
        "/payments/verify",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),
  },

  // Administrator API — every call is authorized server-side by role.
  admin: {
    dashboard: (token: string) =>
      request<AdminDashboard>("/admin/dashboard", {}, token),

    analytics: (token: string) =>
      request<AdminAnalytics>("/admin/analytics", {}, token),

    users: (
      token: string,
      params: {
        search?: string;
        role?: string;
        status?: string;
        sort?: string;
        page?: number;
        per_page?: number;
      } = {}
    ) => request<Paginated<AdminUser>>(`/admin/users${qs(params)}`, {}, token),

    user: (id: number, token: string) =>
      request<AdminUser>(`/admin/users/${id}`, {}, token),

    updateUser: (id: number, data: AdminUserUpdate, token: string) =>
      request<AdminUser>(
        `/admin/users/${id}`,
        { method: "PATCH", body: JSON.stringify(data) },
        token
      ),

    setUserStatus: (id: number, is_active: boolean, token: string) =>
      request<AdminUser>(
        `/admin/users/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ is_active }) },
        token
      ),

    bookings: (
      token: string,
      params: { search?: string; status?: string; page?: number; per_page?: number } = {}
    ) => request<Paginated<AdminBooking>>(`/admin/bookings${qs(params)}`, {}, token),

    setBookingStatus: (id: number, status: string, token: string) =>
      request<AdminBooking>(
        `/admin/bookings/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        token
      ),

    stays: (token: string) => request<StayItem[]>("/admin/stays", {}, token),

    createStay: (data: StayInput, token: string) =>
      request<StayItem>(
        "/admin/stays",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),

    updateStay: (id: string, data: Partial<StayInput>, token: string) =>
      request<StayItem>(
        `/admin/stays/${id}`,
        { method: "PUT", body: JSON.stringify(data) },
        token
      ),

    setStayStatus: (id: string, is_active: boolean, token: string) =>
      request<StayItem>(
        `/admin/stays/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ is_active }) },
        token
      ),

    places: (token: string) => request<PlaceItem[]>("/admin/places", {}, token),

    createPlace: (data: PlaceInput, token: string) =>
      request<PlaceItem>(
        "/admin/places",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),

    updatePlace: (id: number, data: Partial<PlaceInput>, token: string) =>
      request<PlaceItem>(
        `/admin/places/${id}`,
        { method: "PUT", body: JSON.stringify(data) },
        token
      ),

    setPlaceStatus: (id: number, is_active: boolean, token: string) =>
      request<PlaceItem>(
        `/admin/places/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ is_active }) },
        token
      ),

    darshan: (
      token: string,
      params: {
        search?: string;
        status?: string;
        pass_type?: string;
        page?: number;
        per_page?: number;
      } = {}
    ) => request<Paginated<AdminDarshan>>(`/admin/darshan${qs(params)}`, {}, token),

    setDarshanStatus: (id: number, status: string, token: string) =>
      request<AdminDarshan>(
        `/admin/darshan/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        token
      ),

    feedback: (
      token: string,
      params: { search?: string; status?: string; min_rating?: number; page?: number; per_page?: number } = {}
    ) => request<Paginated<FeedbackItem>>(`/admin/feedback${qs(params)}`, {}, token),

    setFeedbackStatus: (id: number, status: string, token: string) =>
      request<FeedbackItem>(
        `/admin/feedback/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        token
      ),

    notifications: (
      token: string,
      params: { status?: string; page?: number; per_page?: number } = {}
    ) => request<Paginated<NotificationItem>>(`/admin/notifications${qs(params)}`, {}, token),

    createNotification: (
      data: { title: string; message: string; audience: string; status: string },
      token: string
    ) =>
      request<NotificationItem>(
        "/admin/notifications",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),

    updateNotification: (
      id: number,
      data: { title: string; message: string; audience: string; status: string },
      token: string
    ) =>
      request<NotificationItem>(
        `/admin/notifications/${id}`,
        { method: "PUT", body: JSON.stringify(data) },
        token
      ),

    announcements: (
      token: string,
      params: { status?: string; page?: number; per_page?: number } = {}
    ) => request<Paginated<AnnouncementItem>>(`/admin/announcements${qs(params)}`, {}, token),

    createAnnouncement: (
      data: { title: string; message: string; status: string },
      token: string
    ) =>
      request<AnnouncementItem>(
        "/admin/announcements",
        { method: "POST", body: JSON.stringify(data) },
        token
      ),

    updateAnnouncement: (
      id: number,
      data: { title: string; message: string; status: string },
      token: string
    ) =>
      request<AnnouncementItem>(
        `/admin/announcements/${id}`,
        { method: "PUT", body: JSON.stringify(data) },
        token
      ),

    // Payments
    payments: (
      token: string,
      params: { search?: string; status?: string; entity_type?: string; page?: number; per_page?: number } = {}
    ) => request<Paginated<AdminPayment>>(`/admin/payments${qs(params)}`, {}, token),

    getPayment: (id: number, token: string) =>
      request<AdminPayment>(`/admin/payments/${id}`, {}, token),

    verifyUtr: (id: number, utr: string, token: string) =>
      request<AdminPayment>(
        `/admin/payments/${id}/verify-utr`,
        { method: "PATCH", body: JSON.stringify({ utr }) },
        token
      ),

    setPaymentStatus: (id: number, status: string, token: string) =>
      request<AdminPayment>(
        `/admin/payments/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        token
      ),
  },
};
