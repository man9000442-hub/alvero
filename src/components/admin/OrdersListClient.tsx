"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Download, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Pagination } from "@/components/ui/States";
import { formatEGP } from "@/lib/pricing";
import type { Locale, Order, OrderStatus } from "@/types/database";

const ALL_STATUSES: OrderStatus[] = [
  "NEW",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export function OrdersListClient({
  orders,
  totalCount,
  page,
  pageSize,
  filters,
}: {
  orders: (Order & { items_count: number })[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: { status?: string; search?: string; from?: string; to?: string };
}) {
  const t = useTranslations("admin.orders");
  const ts = useTranslations("orderStatus");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [search, setSearch] = useState(filters.search ?? "");
  const [status, setStatus] = useState(filters.status ?? "ALL");
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");

  const applyFilters = (nextPage = 1) => {
    const qs = new URLSearchParams();
    if (status && status !== "ALL") qs.set("status", status);
    if (search.trim()) qs.set("search", search.trim());
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (nextPage > 1) qs.set("page", String(nextPage));
    router.push(`/admin/orders?${qs.toString()}`);
  };

  const exportUrl = () => {
    const qs = new URLSearchParams();
    if (status && status !== "ALL") qs.set("status", status);
    if (search.trim()) qs.set("search", search.trim());
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return `/api/admin/orders/export?${qs.toString()}`;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("title")}
        </h1>
        <a href={exportUrl()}>
          <Button variant="secondary" size="sm">
            <Download className="h-3.5 w-3.5" />
            {t("exportCsv")}
          </Button>
        </a>
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters(1);
        }}
        className="bg-white border border-[#E5E5E5] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${t("orderNumber")}, ${t("customer")}, ${t("phone")}...`}
          className="h-10 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
        >
          <option value="ALL">{tc("all")}</option>
          {ALL_STATUSES.map((st) => (
            <option key={st} value={st}>
              {ts(st)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-10 px-3 border border-[#E5E5E5] text-xs bg-white"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-10 px-3 border border-[#E5E5E5] text-xs bg-white"
        />
        <Button type="submit" variant="primary" size="sm" fullWidth>
          <Search className="h-3.5 w-3.5" />
          {tc("filter")}
        </Button>
      </form>

      {orders.length === 0 ? (
        <EmptyState title={tc("noResults")} />
      ) : (
        <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] uppercase tracking-[0.14em] text-[#777777]">
              <tr>
                <th className="py-3.5 px-4 text-start">{t("orderNumber")}</th>
                <th className="py-3.5 px-4 text-start">{t("customer")}</th>
                <th className="py-3.5 px-4 text-start">{t("phone")}</th>
                <th className="py-3.5 px-4 text-start">{t("date")}</th>
                <th className="py-3.5 px-4 text-start">{t("itemsCount")}</th>
                <th className="py-3.5 px-4 text-start">{t("total")}</th>
                <th className="py-3.5 px-4 text-start">{t("payment")}</th>
                <th className="py-3.5 px-4 text-start">{t("status")}</th>
                <th className="py-3.5 px-4 text-end">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-3.5 px-4 font-semibold tracking-wider whitespace-nowrap">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="hover:underline"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">{order.customer_name}</td>
                  <td className="py-3.5 px-4 tabular-nums" dir="ltr">
                    {order.customer_phone}
                  </td>
                  <td className="py-3.5 px-4 text-[#777777] whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString(
                      locale === "ar" ? "ar-EG" : "en-EG",
                    )}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums">
                    {order.items_count}
                  </td>
                  <td className="py-3.5 px-4 font-semibold tabular-nums whitespace-nowrap">
                    {formatEGP(Number(order.total_amount), locale)}
                  </td>
                  <td className="py-3.5 px-4">COD</td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        order.status === "DELIVERED"
                          ? "solid"
                          : order.status === "CANCELLED" ||
                              order.status === "RETURNED"
                            ? "subtle"
                            : "outline"
                      }
                    >
                      {ts(order.status)}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-end">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#E5E5E5] hover:border-black text-[11px] uppercase tracking-wider"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(next) => applyFilters(next)}
        prevLabel={tc("previous")}
        nextLabel={tc("next")}
      />
    </div>
  );
}
