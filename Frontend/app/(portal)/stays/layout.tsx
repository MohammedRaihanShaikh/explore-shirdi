import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Luxury Stays & Ashrams",
  description:
    "Book Sansthan-certified ashrams, heritage haveli rooms, and luxury hotels near Shirdi Samadhi Mandir. Best rates with instant confirmation.",
};

export default function StaysLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
