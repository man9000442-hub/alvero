"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatEGP } from "@/lib/pricing";
import type { Locale, OrderStatus } from "@/types/database";

interface TrackedOrder {
  order_number: string;
  status: OrderStatus;
  payment_method: string;
  currency: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  governorate_name_en: string;
  governorate_name_ar: string;
  city: string;
  district: string;
  created_at: string;
  items: Array<{
    product_name_en: string;
    product_name_ar: string;
    sku: string;
    size: string;
    color_name_en: string;
    color_name_ar: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }>;
  history: Array<{
    to_status: OrderStatus;
    created_at: string;
  }>;
}

const TRACKING_STEPS: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export function TrackOrderClient({
  initialOrderNumber = "",
}: {
  initialOrderNumber?: string;
}) {
  const t = useTranslations("tracking");
  const ts = useTranslations("orderStatus");
  const locale = useLocale() as Locale;

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setOrder(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, phone }),
      });
      if (!res.ok) {
        setErrorMsg(t("notFound"));
        return;
      }
      const data = await res.json();
      if (!data.order) {
        setErrorMsg(t("notFound"));
        return;
      }
      setOrder(data.order);
    } catch {
      setErrorMsg(t("notFound"));
    } finally {
      setLoading(false);
    }
  };

  const activeIdx = order ? TRACKING_STEPS.indexOf(order.status) : -1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl sm:text-4xl uppercase tracking-[0.14em] text-black">
          {t("title")}
        </h1>
        <p className="text-xs sm:text-sm text-[#777777]">{t("subtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E5E5E5] p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("orderNumber")}
            required
            dir="ltr"
            placeholder={t("orderNumberPlaceholder")}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
          <Input
            label={t("phone")}
            required
            dir="ltr"
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-black border-s-2 border-black ps-3 py-1">
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          <Search className="h-4 w-4" />
          {loading ? t("searching") : t("submit")}
        </Button>
      </form>

      {order && (
        <div className="bg-white border border-black p-6 sm:p-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#777777]">
                {t("orderNumber")}
              </p>
              <p className="text-lg font-semibold tracking-wider text-black mt-0.5">
                {order.order_number}
              </p>
            </div>
            <Badge variant="solid">{ts(order.status)}</Badge>
          </div>

          {/* Stepper Timeline */}
          {order.status !== "CANCELLED" && order.status !== "RETURNED" ? (
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#777777]">
                {t("timeline")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {TRACKING_STEPS.map((step, idx) => {
                  const completed = activeIdx >= idx;
                  return (
                    <div
                      key={step}
                      className={`border p-3 text-center space-y-1.5 ${
                        completed
                          ? "border-black bg-black text-white"
                          : "border-[#E5E5E5] bg-[#FAFAFA] text-[#888888]"
                      }`}
                    >
                      <div className="flex justify-center">
                        {completed ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Package className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <p className="text-[10px] uppercase tracking-wider font-medium">
                        {ts(step)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* History Log */}
          <div className="space-y-2.5">
            {order.history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs border-b border-[#F3F3F3] pb-2"
              >
                <span className="font-medium uppercase tracking-wider">
                  {ts(h.to_status)}
                </span>
                <span className="text-[#777777] tabular-nums">
                  {new Date(h.created_at).toLocaleString(
                    locale === "ar" ? "ar-EG" : "en-EG",
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Destination & Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#777777]">
                {t("deliveryTo")}
              </p>
              <p className="font-medium text-black">
                {locale === "ar"
                  ? order.governorate_name_ar
                  : order.governorate_name_en}{" "}
                — {order.city}, {order.district}
              </p>
            </div>
            <div className="space-y-1 sm:text-end">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#777777]">
                COD
              </p>
              <p className="text-base font-semibold tabular-nums text-black">
                {formatEGP(order.total_amount, locale)}
              </p>
            </div>
          </div>

          <div className="space-y-2 border-t border-[#E5E5E5] pt-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#777777]">
              {t("items")}
            </p>
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between text-xs py-1.5 border-b border-[#F5F5F5]"
              >
                <span>
                  {locale === "ar" ? item.product_name_ar : item.product_name_en}{" "}
                  ({locale === "ar" ? item.color_name_ar : item.color_name_en} /{" "}
                  {item.size}) × {item.quantity}
                </span>
                <span className="tabular-nums font-medium">
                  {formatEGP(item.line_total, locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
