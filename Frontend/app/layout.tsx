import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PreferencesProvider } from "@/lib/i18n";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#A73710",
};

export const metadata: Metadata = {
  title: {
    default: "Explore Shirdi — Official Sai Baba Devotee Portal",
    template: "%s | Explore Shirdi",
  },
  description:
    "The official pilgrim portal for Shirdi Sai Baba devotees. Book VIP Darshan passes, Sansthan stays, prasadam dining, and plan your sacred journey with live queue updates.",
  keywords: [
    "Shirdi", "Sai Baba", "Darshan pass", "Samadhi Mandir", "pilgrimage",
    "Shirdi temple booking", "VIP Darshan", "Sansthan Trust", "Shirdi stays",
  ],
  authors: [{ name: "Explore Shirdi" }],
  creator: "Explore Shirdi",
  publisher: "Explore Shirdi",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Explore Shirdi",
    title: "Explore Shirdi — Official Sai Baba Devotee Portal",
    description:
      "Book Darshan passes, Sansthan stays, and prasadam meals for your pilgrimage to Shirdi Sai Baba.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Shirdi — Official Sai Baba Devotee Portal",
    description: "Plan your sacred pilgrimage to Shirdi with VIP Darshan passes and Sansthan accommodation.",
  },
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
