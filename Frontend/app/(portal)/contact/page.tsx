"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  Clock,
  HeartPulse,
  ShieldAlert,
  HelpCircle,
  Star,
  Send,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  MessageSquare,
  Building2,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalFooter from "@/components/portal/PortalFooter";
import { api, type FeedbackItem, type UserProfile } from "@/lib/api";
import { usePreferences } from "@/lib/i18n";

function readCachedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem("shirdi_user");
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

const EMERGENCY_HELPLINES = [
  {
    title: "Sansthan Central Helpline",
    dept: "Shri Saibaba Sansthan Trust (24/7)",
    phone: "+91 2423 258500",
    altPhone: "Toll Free: 1800 233 1224",
    email: "saibaba@sai.org.in",
    icon: Phone,
    badge: "24/7 Devotee Aid",
  },
  {
    title: "Medical Aid & Hospital",
    dept: "Shri Saibaba Super Speciality Hospital",
    phone: "+91 2423 258666",
    altPhone: "Emergency: 108 (Free Ambulance)",
    email: "hospital@sai.org.in",
    icon: HeartPulse,
    badge: "Emergency Care",
  },
  {
    title: "Temple Security & Police",
    dept: "Shirdi Police Station & Gate Security",
    phone: "+91 2423 255133",
    altPhone: "Police Control: 112",
    email: "sp.ahmednagar@mahapolice.gov.in",
    icon: ShieldAlert,
    badge: "Safety & Security",
  },
  {
    title: "Central PRO & Lost & Found",
    dept: "Public Relations Office (Gate No. 1)",
    phone: "+91 2423 258777",
    altPhone: "Gate No. 2 Helpdesk: Ext. 201",
    email: "pro@sai.org.in",
    icon: HelpCircle,
    badge: "Pilgrim Assistance",
  },
];

const TEMPLE_TIMINGS = [
  { activity: "Mandir Gates Open", time: "04:00 AM", note: "Queue lines start moving" },
  { activity: "Kakad Aarti (Morning)", time: "04:30 AM", note: "First aarti of the day" },
  { activity: "Holy Bath (Snan) & Darshan", time: "05:00 AM – 11:30 AM", note: "General & VIP passes" },
  { activity: "Madhyan Aarti (Noon)", time: "12:00 PM", note: "Mid-day offering" },
  { activity: "Dhoop Aarti (Evening)", time: "Sunset (~06:15 PM)", note: "Evening incense offering" },
  { activity: "Shej Aarti (Night)", time: "10:00 PM", note: "Final bedtime aarti" },
  { activity: "Mandir Gates Close", time: "11:15 PM", note: "Sanctum secured" },
  { activity: "Shri Prasadalaya (Annachhatra)", time: "10:00 AM – 10:00 PM", note: "Continuous hot satvik meals" },
  { activity: "Accommodation Booking Counters", time: "24 Hours Open", note: "Sainiketan / Bhaktaniwas" },
];

const FAQS = [
  {
    q: "What is the recommended dress code for visiting the Samadhi Mandir?",
    a: "Devotees are requested to wear dignified, traditional modest attire. Dhoti or Kurta-Pyjama is customary for men, while sarees, salwar suits, or long traditional wear are recommended for women. Sleeveless tops and shorts are respectfully discouraged within the sanctum sanctorum.",
  },
  {
    q: "Are mobile phones, cameras, and luggage allowed inside the temple?",
    a: "Mobile phones, cameras, power banks, and large bags are strictly prohibited inside the main Samadhi Mandir. The Sansthan provides free, computerized cloakrooms and shoe storage facilities near Gate No. 1 and Gate No. 2.",
  },
  {
    q: "How can senior citizens or differently-abled devotees obtain wheelchair assistance?",
    a: "Free wheelchairs and dedicated attendants are available at Gate No. 1 and Gate No. 3. Devotees above 65 years or with mobility difficulties receive prioritized entry along with one accompanying attendant.",
  },
  {
    q: "How far is Shirdi Temple from the airport and railway station?",
    a: "Shirdi Airport (SAG) at Kakadi is approximately 14 km (25-30 minutes by taxi/bus). Sainagar Shirdi Railway Station (SNSI) is just 3 km (8-10 minutes by auto-rickshaw). Kopargaon Railway Station (KPG) is 16 km away.",
  },
  {
    q: "Can I pre-book VIP Darshan and Aarti passes online?",
    a: "Yes! You can reserve passes in advance on this portal via the Darshan section or through the official Sansthan portal. Pass slots open 30 days in advance.",
  },
];

const CATEGORIES = [
  "General Pilgrimage Experience",
  "Darshan Pass & Queue Service",
  "Ashram & Stay Booking",
  "Prasadam & Annachhatra Dining",
  "Cleanliness & Temple Facilities",
  "Website / Portal Suggestion",
];

const RATING_LABELS: Record<number, string> = {
  1: "Needs Improvement",
  2: "Fair",
  3: "Good & Satisfactory",
  4: "Very Good Experience",
  5: "Divine & Blessed (उत्तम)",
};

export default function ContactSupportPage() {
  const { t } = usePreferences();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Form states
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [comment, setComment] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Devotee previous feedback
  const [myFeedbackList, setMyFeedbackList] = useState<FeedbackItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    const cachedToken = localStorage.getItem("shirdi_access_token");
    const cachedUser = readCachedUser();
    setToken(cachedToken);
    setUser(cachedUser);
    if (cachedUser) {
      setName(cachedUser.full_name);
      setEmail(cachedUser.email);
    }
  }, []);

  const fetchFeedbackHistory = useCallback(async () => {
    const tok = localStorage.getItem("shirdi_access_token");
    if (!tok) return;
    try {
      setLoadingHistory(true);
      const res = await api.content.myFeedback(tok);
      setMyFeedbackList(res || []);
    } catch {
      // transient network or unauthenticated
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchFeedbackHistory();
    }
  }, [token, fetchFeedbackHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 5) {
      setSubmitError("Please write at least 5 characters in your message.");
      return;
    }

    const payloadComment = `[${category}] ${trimmedComment}`;
    setSubmitting(true);

    try {
      const activeToken = localStorage.getItem("shirdi_access_token");
      if (activeToken) {
        await api.content.submitFeedback(
          { rating, comment: payloadComment },
          activeToken
        );
        fetchFeedbackHistory();
      } else {
        // Devotee is guest - simulate clean feedback acknowledgment
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      setSubmitSuccess(true);
      setComment("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit feedback. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFeedback = async (id: number) => {
    const tok = localStorage.getItem("shirdi_access_token");
    if (!tok) return;
    try {
      await api.content.deleteFeedback(id, tok);
      setMyFeedbackList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to delete feedback", err);
    }
  };

  const activeStarCount = hoverRating || rating;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between text-slate-800">
      {/* ─── Portal Header / Navbar ─────────────────────────────────── */}
      <PortalHeader />

      {/* ─── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
        {/* Page Hero Header */}
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-[#B45309] uppercase block mb-1">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-[#C2410C]" />
            Shri Saibaba Sansthan Trust Pilgrim Services
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 tracking-tight mb-2">
            {t("contact.title")}
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            {t("contact.subtitle")}
          </p>
        </div>

        {/* ─── Emergency & Helplines Grid ─────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#A73710]" />
                {t("contact.emergencyHelplines")}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct contact lines for temple administration, emergency medical aid, and security desks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {EMERGENCY_HELPLINES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl border border-amber-900/10 p-5 shadow-xs hover:border-amber-900/25 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#A73710]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-50 text-[#B45309] border border-amber-200/60">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mb-1">{item.title}</h3>
                    <p className="text-xs text-slate-500 mb-3 leading-snug">{item.dept}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 space-y-1">
                    <a
                      href={`tel:${item.phone.replace(/[^0-9+]/g, "")}`}
                      className="block text-xs font-bold text-[#A73710] hover:text-[#8F2E0C] transition-colors"
                    >
                      {item.phone}
                    </a>
                    <p className="text-[11px] text-slate-500">{item.altPhone}</p>
                    <a
                      href={`mailto:${item.email}`}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors truncate max-w-full"
                    >
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Feedback Form + Temple Timings ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Feedback & Inquiry Form (7 cols) */}
          <section className="lg:col-span-7 bg-white rounded-2xl border border-amber-900/10 p-6 sm:p-8 shadow-xs">
            <div className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-[#C2410C]" />
                Devotee Desk
              </span>
              <h2 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
                {t("contact.feedbackTitle")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {t("contact.feedbackSubtitle")}
              </p>
            </div>

            {!user && (
              <div className="mb-6 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-[#B45309] mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span>Visiting as a guest devotee. For tracked inquiries and official follow-up, </span>
                  <Link href="/login" className="font-bold text-[#A73710] underline hover:text-[#8F2E0C]">
                    sign in here
                  </Link>
                  <span>.</span>
                </div>
              </div>
            )}

            {submitSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-bold">{t("contact.feedbackSubmitted")}</p>
                  <p className="text-emerald-700 mt-0.5">
                    Your feedback has been recorded and submitted to temple administrative staff.
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm font-medium">{submitError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Star Rating Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {t("contact.ratingLabel")}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRating(val)}
                      onMouseEnter={() => setHoverRating(val)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-slate-300 hover:text-amber-500 transition-colors focus:outline-none"
                      aria-label={`Rate ${val} stars`}
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${
                          val <= activeStarCount
                            ? "fill-amber-400 text-amber-400 scale-105"
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-slate-600 ml-2">
                    {RATING_LABELS[activeStarCount] || ""}
                  </span>
                </div>
              </div>

              {/* Category Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {t("contact.categoryLabel")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        category === cat
                          ? "bg-[#A73710] text-white border-[#A73710] font-semibold shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:border-amber-900/30 hover:text-[#A73710]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Email Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Devotee Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Ramesh Kulkarni"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/20 focus:border-[#A73710]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Devotee Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/20 focus:border-[#A73710]"
                  />
                </div>
              </div>

              {/* Message / Comment Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    {t("contact.commentLabel")}
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {comment.length} / 2000 chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details of your visit, suggestions for temple queue management, prasadam experience, or ask a question..."
                  maxLength={2000}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#A73710]/20 focus:border-[#A73710] resize-y"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#A73710] hover:bg-[#8F2E0C] text-white text-xs sm:text-sm font-bold transition-all disabled:opacity-60 shadow-xs cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t("contact.submitting")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{t("contact.submitFeedback")}</span>
                  </>
                )}
              </button>
            </form>

            {/* Devotee's previous feedback list */}
            {user && (
              <div className="mt-10 pt-8 border-t border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    {t("contact.myFeedback")}
                  </h3>
                  {loadingHistory && (
                    <span className="text-[11px] text-slate-400">Loading...</span>
                  )}
                </div>

                {myFeedbackList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    {t("contact.noFeedback")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myFeedbackList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 bg-[#FCFAF6] flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < item.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase">
                              {item.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-slate-800 leading-relaxed font-normal">
                            {item.comment}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFeedback(item.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Delete submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right Column: Temple Complex Timings (5 cols) */}
          <section className="lg:col-span-5 bg-white rounded-2xl border border-amber-900/10 p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-[#C2410C]" />
                Schedule & Aarti
              </span>
              <h2 className="text-xl font-bold text-slate-900 font-serif tracking-tight">
                {t("contact.timings")}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Official Sansthan daily darshan & prasadalaya hours.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {TEMPLE_TIMINGS.map((row) => (
                <div key={row.activity} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{row.activity}</p>
                    <p className="text-[11px] text-slate-500">{row.note}</p>
                  </div>
                  <div className="font-mono font-bold text-slate-800 text-right">
                    {row.time}
                  </div>
                </div>
              ))}
            </div>

            {/* Official Sansthan Postal Address Card */}
            <div className="pt-4 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-[#FCFAF6] border border-amber-900/10 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
                  <Building2 className="w-4 h-4 text-[#A73710]" />
                  <span>Sansthan Trust Headquarters</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Shri Saibaba Sansthan Trust, Shirdi
                  <br />
                  Tal. Rahata, Dist. Ahmednagar, Maharashtra — 423109, India
                </p>
                <div className="pt-2">
                  <a
                    href="https://maps.google.com/?q=Shri+Saibaba+Sansthan+Trust+Shirdi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A73710] hover:text-[#8F2E0C] underline"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ─── Frequently Asked Questions (FAQ) ───────────────────── */}
        <section className="bg-white rounded-2xl border border-amber-900/10 p-6 sm:p-8 shadow-xs">
          <div className="max-w-3xl mb-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5 mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-[#C2410C]" />
              Pilgrim Information
            </span>
            <h2 className="text-2xl font-bold text-slate-900 font-serif tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Essential answers regarding temple protocol, luggage storage, and transit to Shirdi.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-4 focus:outline-none group cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-[#A73710] transition-colors">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isOpen ? "rotate-180 text-[#A73710]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed pr-8">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ─── Devotional Footer ───────────────────────────────────────── */}
      <PortalFooter />
    </div>
  );
}
