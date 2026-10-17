import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Support",
  description:
    "Get in touch with the Shirdi Sansthan helpline, temple administration, and emergency services. Submit feedback and find answers to common pilgrimage questions.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
