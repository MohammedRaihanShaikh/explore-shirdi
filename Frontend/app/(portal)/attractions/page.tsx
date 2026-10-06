import React from "react";
import { Metadata } from "next";
import PortalHeader from "@/components/portal/PortalHeader";
import PortalFooter from "@/components/portal/PortalFooter";
import AttractionsContent from "@/components/portal/AttractionsContent";

export const metadata: Metadata = {
  title: "Discover & Attractions - Explore Shirdi",
  description:
    "Explore sacred sites, pilgrimage spots and divine attractions around Shirdi.",
};

export default function AttractionsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col">
      <PortalHeader />

      {/* Client component: loads GET /api/places and drives the detail sheet */}
      <AttractionsContent />

      <PortalFooter />
    </div>
  );
}