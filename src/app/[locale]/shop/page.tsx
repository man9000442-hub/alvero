import type { Metadata } from "next";
import { getActiveCategories, getShopProducts } from "@/lib/data/storefront";
import { ShopCatalogClient } from "@/components/storefront/ShopCatalogClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  return {
    title: isAr ? "المتجر — المجموعة الكاملة" : "Shop Collection",
    description: isAr
      ? "تصفح تشكيلة ألفيرو الكاملة من الأزياء الفاخرة أحادية اللون."
      : "Explore the complete ALVERO luxury monochrome apparel collection.",
    alternates: {
      canonical: `/${locale}/shop`,
      languages: { en: "/en/shop", ar: "/ar/shop" },
    },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (key: string) =>
    typeof sp[key] === "string" ? (sp[key] as string) : undefined;
  const num = (key: string) => {
    const v = str(key);
    return v && !Number.isNaN(Number(v)) ? Number(v) : undefined;
  };

  const sortRaw = str("sort");
  const validSorts = [
    "newest",
    "price_asc",
    "price_desc",
    "popularity",
    "best_sellers",
  ] as const;
  const sort = validSorts.includes(sortRaw as (typeof validSorts)[number])
    ? (sortRaw as (typeof validSorts)[number])
    : "newest";

  const [catalog, categories] = await Promise.all([
    getShopProducts({
      search: str("search"),
      category: str("category"),
      minPrice: num("minPrice"),
      maxPrice: num("maxPrice"),
      size: str("size"),
      color: str("color"),
      inStock: str("inStock") === "true",
      sort,
      page: num("page") ?? 1,
      pageSize: 12,
    }),
    getActiveCategories(),
  ]);

  return (
    <ShopCatalogClient
      products={catalog.products}
      totalCount={catalog.totalCount}
      page={catalog.page}
      totalPages={catalog.totalPages}
      categories={categories}
      availableSizes={catalog.availableSizes}
      availableColors={catalog.availableColors}
      currentFilters={{
        search: str("search"),
        category: str("category"),
        minPrice: str("minPrice"),
        maxPrice: str("maxPrice"),
        size: str("size"),
        color: str("color"),
        inStock: str("inStock") === "true",
        sort,
      }}
    />
  );
}
