import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://genzstudy.in";
  const routes = ["/", "/resources", "/support", "/privacy", "/terms", "/refund"];
  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" || path === "/resources" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/resources" ? 0.8 : 0.3,
  }));
}
