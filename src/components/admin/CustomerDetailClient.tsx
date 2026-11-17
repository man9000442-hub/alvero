"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { formatEGP } from "@/lib/pricing";
import type { Customer, Locale, Order } from "@/types/database";

export function CustomerDetailClient({
  customer,
  orders,
}: {
  customer: Customer;
  orders: Order[];
}) {
  const ts = useTranslations("orderStatus");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();

  const [notes, setNotes] = useState(customer.notes ?? "");
  const [saving, setSaving] = useState(false);

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        showToast("Customer notes saved", "success");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 pb-5 border-b border-[#E5E5E5]">
        <Link
          href="/admin/customers"
          className="p-2 border border-[#E5E5E5] hover:border-black bg-white"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Link>
        <div>
          <h1 className="font-serif text-3xl uppercase tracking-[0.1em]">
            {customer.full_name}
          </h1>
          <p className="text-xs text-[#777777]" dir="ltr">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E5E5] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#777777]">
            Total Orders
          </p>
          <p className="text-xl font-semibold mt-1">{customer.total_orders}</p>
        </div>
        <div className="bg-white border border-[#E5E5E5] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#777777]">
            Delivered
          </p>
          <p className="text-xl font-semibold mt-1">
            {customer.delivered_orders}
          </p>
        </div>
        <div className="bg-white border border-[#E5E5E5] p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#777777]">
            Cancelled
          </p>
          <p className="text-xl font-semibold mt-1">
            {customer.cancelled_orders}
          </p>
        </div>
        <div className="bg-black text-white border border-black p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#AAAAAA]">
            Delivered Spending
          </p>
          <p className="text-xl font-semibold mt-1 tabular-nums">
            {formatEGP(Number(customer.total_delivered_spent), locale)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white border border-[#E5E5E5] p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            Order History
          </h2>
          <div className="divide-y divide-[#F0F0F0] text-xs">
            {orders.map((o) => (
              <div
                key={o.id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-semibold hover:underline"
                  >
                    {o.order_number}
                  </Link>
                  <p className="text-[#777777]">
                    {new Date(o.created_at).toLocaleDateString()} ·{" "}
                    {o.governorate_name_en}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={o.status === "DELIVERED" ? "solid" : "outline"}>
                    {ts(o.status)}
                  </Badge>
                  <span className="font-semibold tabular-nums">
                    {formatEGP(Number(o.total_amount), locale)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-[#E5E5E5] p-6 space-y-4 h-fit">
          <Textarea
            label="Customer Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            variant="primary"
            size="sm"
            fullWidth
            loading={saving}
            onClick={saveNotes}
          >
            {tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
