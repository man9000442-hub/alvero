import type { Metadata } from "next";
import { getWebsiteSettings } from "@/lib/data/storefront";
import { CartPageClient } from "@/components/storefront/CartPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "حقيبة التسوق" : "Shopping Bag",
  };
}

export default async function CartPage() {
  const settings = await getWebsiteSettings();
  return <CartPageClient copy={settings.storefront_copy} />;
}
