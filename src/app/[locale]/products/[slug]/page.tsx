import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getWebsiteSettings } from "@/lib/data/storefront";
import { resolveProductEffectivePrice } from "@/lib/pricing";
import { ProductDetailClient } from "@/components/storefront/ProductDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { product } = await getProductBySlug(slug);
  if (!product) {
    return { title: "Product Not Found" };
  }

  const isAr = locale === "ar";
  const title = isAr
    ? product.seo_title_ar || product.name_ar
    : product.seo_title_en || product.name_en;
  const description = isAr
    ? product.seo_description_ar || product.description_ar
    : product.seo_description_en || product.description_en;

  return {
    title,
    description: description.slice(0, 160),
    alternates: {
      canonical: `/${locale}/products/${product.slug}`,
      languages: {
        en: `/en/products/${product.slug}`,
        ar: `/ar/products/${product.slug}`,
      },
    },
    openGraph: {
      title,
      description: description.slice(0, 160),
      images: product.main_image_url ? [product.main_image_url] : [],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [{ product, relatedProducts }, settings] = await Promise.all([
    getProductBySlug(slug),
    getWebsiteSettings(),
  ]);

  if (!product) {
    notFound();
  }

  const { unitPrice } = resolveProductEffectivePrice(product);
  const totalStock = (product.variants ?? [])
    .filter((v) => v.is_available)
    .reduce((acc, v) => acc + v.stock_quantity, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: locale === "ar" ? product.name_ar : product.name_en,
    description:
      locale === "ar" ? product.description_ar : product.description_en,
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brand || "ALVERO",
    },
    image: product.main_image_url ? [product.main_image_url] : [],
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      price: unitPrice,
      availability:
        totalStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient
        product={product}
        relatedProducts={relatedProducts}
        copy={settings.storefront_copy}
      />
    </>
  );
}
