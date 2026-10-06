import type { Metadata } from "next";
import "./globals.css";
import { PreferencesProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Explore Shirdi - Sacred Sanctuary Portal & Devotee Access",
  description:
    "The definitive luxury pilgrimage accompaniment for Shirdi Sai Baba devotees, offering sacred slot scheduling, boutique retreat discovery, and personalized sanctum travel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="font-sans bg-[#F4F6FB] text-slate-800 antialiased min-h-full flex flex-col">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
