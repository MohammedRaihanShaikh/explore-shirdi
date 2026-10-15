import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prasadam & Satvik Dining",
  description:
    "Pre-book satvik prasadam meals at the Shri Prasadalaya Annachhatra near Shirdi temple. Wholesome Sansthan-approved vegetarian thali for devotees.",
};

export default function DiningLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
