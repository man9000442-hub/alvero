import type { Metadata } from "next";
import {
  getActiveShippingConfig,
  getWebsiteSettings,
} from "@/lib/data/storefront";
import { CheckoutClient } from "@/components/storefront/CheckoutClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "إتمام الطلب — الدفع عند الاستلام" : "Checkout — Cash on Delivery",
  };
}

export default async function CheckoutPage() {
  const [shippingConfig, settings] = await Promise.all([
    getActiveShippingConfig(),
    getWebsiteSettings(),
  ]);

  return (
    <CheckoutClient
      governorates={shippingConfig.governorates}
      areas={shippingConfig.areas}
      globalRule={shippingConfig.globalRule}
      storeStatus={settings.store_status}
      copy={settings.storefront_copy}
    />
  );
}
