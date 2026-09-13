import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/templates", changeFrequency: "weekly", priority: 0.8 },
    { path: "/developers", changeFrequency: "monthly", priority: 0.6 },
    { path: "/support", changeFrequency: "monthly", priority: 0.6 },
  ];

  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
