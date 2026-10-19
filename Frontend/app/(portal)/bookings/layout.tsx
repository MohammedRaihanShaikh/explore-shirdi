import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Bookings",
  description:
    "View and manage all your Darshan pass reservations, accommodation bookings, and prasadam dining orders in one place.",
};

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
