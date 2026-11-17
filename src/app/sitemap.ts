import type { MetadataRoute } from "next";
import { createSupabaseServerClient, isServerSupabaseConfigured } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alvero.eg";
  const staticPaths = [
    "",
    "/shop",
    "/about",
    "/contact",
    "/track-order",
    "/policies/shipping",
    "/policies/returns",
    "/policies/privacy",
    "/policies/terms",
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const path of staticPaths) {
    for (const locale of ["en", "ar"]) {
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: path === "" ? 1.0 : 0.8,
        alternates: {
          languages: {
            en: `${baseUrl}/en${path}`,
            ar: `${baseUrl}/ar${path}`,
          },
        },
      });
    }
  }

  if (isServerSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data: products } = await supabase
        .from("products")
        .select("slug, updated_at")
        .eq("status", "ACTIVE")
        .is("deleted_at", null)
        .limit(500);

      for (const p of products ?? []) {
        for (const locale of ["en", "ar"]) {
          entries.push({
            url: `${baseUrl}/${locale}/products/${p.slug}`,
            lastModified: new Date(p.updated_at),
            changeFrequency: "weekly",
            priority: 0.9,
            alternates: {
              languages: {
                en: `${baseUrl}/en/products/${p.slug}`,
                ar: `${baseUrl}/ar/products/${p.slug}`,
              },
            },
          });
        }
      }
    } catch {
      // Skip dynamic product entries if DB isn't ready
    }
  }

  return entries;
}
