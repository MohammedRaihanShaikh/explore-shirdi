import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Pilgrimage Planner",
  description:
    "Plan your perfect Shirdi pilgrimage with our AI-powered itinerary assistant. Get personalised day-by-day schedules for Darshan, aarti timings, stays, and sacred sites.",
};

export default function AIPlannerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
