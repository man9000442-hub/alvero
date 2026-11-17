import type { Metadata } from "next";
import { TrackOrderClient } from "@/components/storefront/TrackOrderClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "تتبع الطلب" : "Track Order",
  };
}

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;
  return <TrackOrderClient initialOrderNumber={orderNumber ?? ""} />;
}
