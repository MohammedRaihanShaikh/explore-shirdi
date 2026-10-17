import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://exploreshirdi.com";
  const now = new Date();

  return [
    { url: `${base}/dashboard`,   lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/darshan`,     lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/stays`,       lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/dining`,      lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/attractions`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/ai-planner`,  lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`,     lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/bookings`,    lastModified: now, changeFrequency: "daily",   priority: 0.6 },
    { url: `${base}/login`,       lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/register`,    lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];
}
