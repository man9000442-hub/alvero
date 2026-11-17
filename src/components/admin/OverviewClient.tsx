"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatEGP } from "@/lib/pricing";
import { Badge } from "@/components/ui/Badge";
import type { DashboardMetrics, DatePreset } from "@/lib/data/admin";
import type { Locale } from "@/types/database";

export function OverviewClient({
  metrics,
  preset,
  fromDate,
  toDate,
}: {
  metrics: DashboardMetrics;
  preset: DatePreset;
  fromDate?: string;
  toDate?: string;
}) {
  const t = useTranslations("admin.overview");
  const ts = useTranslations("orderStatus");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [customFrom, setCustomFrom] = useState(fromDate ?? "");
  const [customTo, setCustomTo] = useState(toDate ?? "");

  const applyPreset = (nextPreset: DatePreset) => {
    if (nextPreset === "custom") {
      const qs = new URLSearchParams({ preset: "custom" });
      if (customFrom) qs.set("from", customFrom);
      if (customTo) qs.set("to", customTo);
      router.push(`/admin?${qs.toString()}`);
    } else {
      router.push(`/admin?preset=${nextPreset}`);
    }
  };

  const maxOrdersDay = Math.max(
    1,
    ...metrics.ordersOverTime.map((d) => d.orders),
  );
  const maxRevDay = Math.max(
    1,
    ...metrics.ordersOverTime.map((d) => d.revenue),
  );
  const maxStatusCount = Math.max(
    1,
    ...metrics.ordersByStatus.map((s) => s.count),
  );

  return (
    <div className="space-y-8">
      {/* Header + Date Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
            {t("title")}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["today", "7d", "30d", "month"] as DatePreset[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => applyPreset(p)}
              className={`h-9 px-3.5 text-xs uppercase tracking-wider border cursor-pointer ${
                preset === p
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-[#E5E5E5] hover:border-black"
              }`}
            >
              {p === "today"
                ? t("today")
                : p === "7d"
                  ? t("last7")
                  : p === "30d"
                    ? t("last30")
                    : t("thisMonth")}
            </button>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 px-2 border border-[#E5E5E5] text-xs bg-white"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 px-2 border border-[#E5E5E5] text-xs bg-white"
            />
            <button
              type="button"
              onClick={() => applyPreset("custom")}
              className={`h-9 px-3 text-xs uppercase tracking-wider border cursor-pointer ${
                preset === "custom"
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-[#E5E5E5] hover:border-black"
              }`}
            >
              {t("custom")}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Financial KPIs — Clearly Separating Delivered vs Confirmed vs Pending */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black text-white p-6 space-y-2 border border-black">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#AAAAAA]">
            {t("deliveredRevenue")}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatEGP(metrics.deliveredRevenue, locale)}
          </p>
          <p className="text-[11px] text-[#CCCCCC]">
            {metrics.deliveredOrders} {t("deliveredOrders")}
          </p>
        </div>

        <div className="bg-white p-6 space-y-2 border border-[#E5E5E5]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777]">
            {t("confirmedRevenue")}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-black">
            {formatEGP(metrics.confirmedRevenue, locale)}
          </p>
          <p className="text-[11px] text-[#777777]">
            {metrics.confirmedOrders + metrics.shippedOrders} active pipeline
          </p>
        </div>

        <div className="bg-white p-6 space-y-2 border border-[#E5E5E5]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777]">
            {t("pendingValue")}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-black">
            {formatEGP(metrics.pendingOrderValue, locale)}
          </p>
          <p className="text-[11px] text-[#777777]">
            {metrics.newOrders + metrics.pendingOrders} awaiting review
          </p>
        </div>

        <div className="bg-white p-6 space-y-2 border border-[#E5E5E5]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777]">
            {t("totalSales")}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-black">
            {formatEGP(metrics.totalSalesGross, locale)}
          </p>
          <p className="text-[11px] text-[#777777]">
            {metrics.totalOrders} {t("totalOrders")}
          </p>
        </div>
      </div>

      {/* Order & Catalog Operational KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: t("newOrders"), value: metrics.newOrders },
          { label: t("pendingOrders"), value: metrics.pendingOrders },
          { label: t("confirmedOrders"), value: metrics.confirmedOrders },
          { label: t("shippedOrders"), value: metrics.shippedOrders },
          { label: t("cancelledOrders"), value: metrics.cancelledOrders },
          { label: t("totalProducts"), value: metrics.totalActiveProducts },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-[#E5E5E5] p-4 space-y-1"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#777777]">
              {kpi.label}
            </p>
            <p className="text-xl font-semibold tabular-nums">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/inventory?filter=low"
          className="bg-white border border-[#E5E5E5] hover:border-black p-5 flex items-center justify-between transition-colors"
        >
          <span className="text-xs uppercase tracking-[0.14em] font-medium">
            {t("lowStock")}
          </span>
          <Badge variant="outline">{metrics.lowStockVariants}</Badge>
        </Link>
        <Link
          href="/admin/inventory?filter=out"
          className="bg-white border border-[#E5E5E5] hover:border-black p-5 flex items-center justify-between transition-colors"
        >
          <span className="text-xs uppercase tracking-[0.14em] font-medium">
            {t("outOfStock")}
          </span>
          <Badge variant="solid">{metrics.outOfStockVariants}</Badge>
        </Link>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Over Time Bar Chart */}
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            {t("ordersOverTime")}
          </h2>
          {metrics.ordersOverTime.length === 0 ? (
            <p className="text-xs text-[#777777] py-10 text-center">
              No order activity in selected range.
            </p>
          ) : (
            <div className="h-44 flex items-end gap-1.5 pt-4 border-b border-[#E5E5E5]">
              {metrics.ordersOverTime.map((d) => {
                const pct = Math.max(6, (d.orders / maxOrdersDay) * 100);
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.orders} orders`}
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                  >
                    <div
                      className="w-full bg-black transition-opacity group-hover:opacity-75"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delivered Revenue Over Time */}
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            {t("revenueOverTime")}
          </h2>
          {metrics.ordersOverTime.length === 0 ? (
            <p className="text-xs text-[#777777] py-10 text-center">
              No delivered revenue in selected range.
            </p>
          ) : (
            <div className="h-44 flex items-end gap-1.5 pt-4 border-b border-[#E5E5E5]">
              {metrics.ordersOverTime.map((d) => {
                const pct = Math.max(4, (d.revenue / maxRevDay) * 100);
                return (
                  <div
                    key={d.date}
                    title={`${d.date}: ${formatEGP(d.revenue, locale)}`}
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                  >
                    <div
                      className="w-full bg-[#333333] transition-opacity group-hover:opacity-75"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Orders by Status */}
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            {t("ordersByStatus")}
          </h2>
          <div className="space-y-3">
            {metrics.ordersByStatus.map((s) => (
              <div key={s.status} className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>{ts(s.status)}</span>
                  <span className="tabular-nums font-medium">{s.count}</span>
                </div>
                <div className="h-1.5 bg-[#F0F0F0] w-full">
                  <div
                    className="h-full bg-black"
                    style={{
                      width: `${Math.round((s.count / maxStatusCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Selling Products */}
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            {t("bestSellers")}
          </h2>
          {metrics.bestSellingProducts.length === 0 ? (
            <p className="text-xs text-[#777777] py-6">No product sales yet.</p>
          ) : (
            <div className="divide-y divide-[#F2F2F2] text-xs">
              {metrics.bestSellingProducts.map((p) => (
                <div
                  key={p.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {locale === "ar" ? p.name_ar : p.name_en}
                    </p>
                    <p className="text-[11px] text-[#777777]">{p.sku}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-semibold tabular-nums">
                      {p.sales_count} sold
                    </p>
                    <p className="text-[11px] text-[#777777] tabular-nums">
                      {formatEGP(p.regular_price, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
