import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES } from "@/lib/seo/sitemap-routes";

const SITE_URL = "https://buildcv.co";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
