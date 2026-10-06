import React from "react";
import { Metadata } from "next";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalFooter from "@/components/portal/PortalFooter";
import DarshanContent from "@/components/portal/DarshanContent";

export const metadata: Metadata = {
  title: "Darshan & Live Aarti - Explore Shirdi",
  description: "Book VIP darshan passes and watch live Aarti broadcasts from Shirdi Samadhi Mandir.",
};

export default function DarshanPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <PortalHeader />

      {/* Client component: live pass booking + reminders via the backend API */}
      <DarshanContent />

      <PortalFooter />
    </div>
  );
}
