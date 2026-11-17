import React from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";
import { getWebsiteSettings } from "@/lib/data/storefront";
import { buildWhatsAppOrderUrl, formatEGP } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Locale, Order } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale: rawLocale, orderNumber } = await params;
  const { token } = await searchParams;
  const locale: Locale = rawLocale === "ar" ? "ar" : "en";

  if (!token || !isAdminSupabaseConfigured()) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: orderData }, settings] = await Promise.all([
    supabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("order_number", decodeURIComponent(orderNumber))
      .eq("tracking_token", token)
      .maybeSingle(),
    getWebsiteSettings(),
  ]);

  if (!orderData) {
    notFound();
  }

  const order = orderData as Order;
  const t = await getTranslations("confirmation");
  const ts = await getTranslations("orderStatus");

  const whatsappUrl =
    settings.order_notification_whatsapp_enabled && settings.whatsapp_number
      ? buildWhatsAppOrderUrl({
          whatsappNumber: settings.whatsapp_number,
          orderNumber: order.order_number,
          customerName: order.customer_name,
          totalAmount: Number(order.total_amount),
          locale,
        })
      : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <div className="bg-white border border-black p-8 sm:p-12 space-y-8">
        <div className="text-center space-y-3 pb-6 border-b border-[#E5E5E5]">
          <CheckCircle2 className="h-10 w-10 mx-auto stroke-[1.4] text-black" />
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#777777]">
            {t("eyebrow")}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl uppercase tracking-[0.1em]">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-[#666666]">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
          <div className="border border-[#E5E5E5] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#777777]">
              {t("orderNumber")}
            </p>
            <p className="mt-1 font-semibold text-sm tracking-wider">
              {order.order_number}
            </p>
          </div>
          <div className="border border-[#E5E5E5] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#777777]">
              {t("status")}
            </p>
            <div className="mt-1">
              <Badge variant="solid">{ts(order.status)}</Badge>
            </div>
          </div>
          <div className="border border-[#E5E5E5] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#777777]">
              {t("payment")}
            </p>
            <p className="mt-1 font-semibold">{t("codLabel")}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] pb-2 border-b border-[#E5E5E5]">
            {t("summaryTitle")}
          </h2>
          <div className="divide-y divide-[#F2F2F2] text-xs">
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="py-3 flex justify-between gap-4">
                <div>
                  <p className="font-medium uppercase tracking-wide">
                    {locale === "ar" ? item.product_name_ar : item.product_name_en}
                  </p>
                  <p className="text-[#777777] mt-0.5">
                    {locale === "ar" ? item.color_name_ar : item.color_name_en} /{" "}
                    {item.size} × {item.quantity}
                  </p>
                </div>
                <span className="font-medium tabular-nums">
                  {formatEGP(Number(item.line_total), locale)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E5E5E5] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#777777]">Subtotal</span>
              <span className="tabular-nums">
                {formatEGP(Number(order.subtotal), locale)}
              </span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-[#777777]">Discount</span>
                <span className="tabular-nums">
                  -{formatEGP(Number(order.discount_amount), locale)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#777777]">Shipping</span>
              <span className="tabular-nums">
                {formatEGP(Number(order.shipping_fee), locale)}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-black text-sm font-semibold">
              <span>Total (COD)</span>
              <span className="tabular-nums">
                {formatEGP(Number(order.total_amount), locale)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1"
            >
              <Button variant="primary" size="lg" fullWidth>
                <MessageCircle className="h-4 w-4" />
                {t("whatsappButton")}
              </Button>
            </a>
          )}
          <Link
            href={`/track-order?orderNumber=${encodeURIComponent(order.order_number)}`}
            className="flex-1"
          >
            <Button variant="secondary" size="lg" fullWidth>
              {t("trackButton")}
            </Button>
          </Link>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/shop"
            className="text-xs uppercase tracking-[0.16em] text-[#777777] hover:text-black underline underline-offset-4"
          >
            {t("continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
