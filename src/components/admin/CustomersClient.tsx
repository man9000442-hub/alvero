"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { formatEGP } from "@/lib/pricing";
import type { Customer, Locale } from "@/types/database";

export function CustomersClient({
  customers,
  initialSearch = "",
}: {
  customers: Customer[];
  initialSearch?: string;
}) {
  const t = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      search.trim()
        ? `/admin/customers?search=${encodeURIComponent(search.trim())}`
        : "/admin/customers",
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("customers")}
        </h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or phone..."
          className="flex-1 h-10 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
        />
        <Button type="submit" variant="primary" size="sm">
          <Search className="h-3.5 w-3.5" />
          {tc("search")}
        </Button>
      </form>

      {customers.length === 0 ? (
        <EmptyState title={tc("noResults")} />
      ) : (
        <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] uppercase tracking-[0.14em] text-[#777777]">
              <tr>
                <th className="py-3.5 px-4 text-start">Customer</th>
                <th className="py-3.5 px-4 text-start">Phone</th>
                <th className="py-3.5 px-4 text-start">Total Orders</th>
                <th className="py-3.5 px-4 text-start">Delivered</th>
                <th className="py-3.5 px-4 text-start">Cancelled</th>
                <th className="py-3.5 px-4 text-start">Delivered Spend</th>
                <th className="py-3.5 px-4 text-end">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-3 px-4 font-medium">{c.full_name}</td>
                  <td className="py-3 px-4 tabular-nums" dir="ltr">
                    {c.phone}
                  </td>
                  <td className="py-3 px-4 tabular-nums">{c.total_orders}</td>
                  <td className="py-3 px-4 tabular-nums">
                    {c.delivered_orders}
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    {c.cancelled_orders}
                  </td>
                  <td className="py-3 px-4 font-semibold tabular-nums">
                    {formatEGP(Number(c.total_delivered_spent), locale)}
                  </td>
                  <td className="py-3 px-4 text-end">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="px-3 py-1 border border-[#E5E5E5] hover:border-black text-[11px] uppercase tracking-wider"
                    >
                      Profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
