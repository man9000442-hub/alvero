"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatEGP } from "@/lib/pricing";
import type { Locale, Order, OrderStatus } from "@/types/database";

const STATUS_LIST: OrderStatus[] = [
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

export function OrderDetailClient({ order }: { order: Order }) {
  const t = useTranslations("admin.orders");
  const ts = useTranslations("orderStatus");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();

  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [statusNote, setStatusNote] = useState("");
  const [internalNotes, setInternalNotes] = useState(order.internal_notes ?? "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [printMode, setPrintMode] = useState<"invoice" | "packing" | null>(null);

  const handleStatusUpdate = async () => {
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: statusNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to update status", "error");
        return;
      }
      setStatusNote("");
      showToast("Order status updated", "success");
      router.refresh();
    } finally {
      setSavingStatus(false);
    }
  };

  const handleNotesSave = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: internalNotes }),
      });
      if (res.ok) {
        showToast("Internal notes saved", "success");
        router.refresh();
      } else {
        showToast("Failed to save notes", "error");
      }
    } finally {
      setSavingNotes(false);
    }
  };

  const triggerPrint = (mode: "invoice" | "packing") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-8">
      {/* Screen Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5] no-print">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="p-2 border border-[#E5E5E5] hover:border-black bg-white"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl sm:text-3xl tracking-wider">
                {order.order_number}
              </h1>
              <Badge variant="solid">{ts(order.status)}</Badge>
            </div>
            <p className="text-xs text-[#777777] mt-1">
              {new Date(order.created_at).toLocaleString()} · COD (EGP) · Stock
              Deducted: {order.stock_deducted ? "Yes" : "Restored"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => triggerPrint("invoice")}
          >
            <Printer className="h-3.5 w-3.5" />
            {t("printInvoice")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerPrint("packing")}
          >
            <Printer className="h-3.5 w-3.5" />
            {t("printPackingSlip")}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 no-print">
        <div className="lg:col-span-8 space-y-6">
          {/* Items Snapshot */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] pb-3 border-b border-[#E5E5E5]">
              Ordered Items (Historical Snapshot)
            </h2>
            <div className="divide-y divide-[#F0F0F0] text-xs">
              {(order.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-semibold uppercase tracking-wide">
                      {locale === "ar"
                        ? item.product_name_ar
                        : item.product_name_en}
                    </p>
                    <p className="text-[#777777] mt-0.5">
                      SKU: {item.sku} ·{" "}
                      {locale === "ar"
                        ? item.color_name_ar
                        : item.color_name_en}{" "}
                      / {item.size}
                    </p>
                  </div>
                  <div className="text-end tabular-nums">
                    <p>
                      {formatEGP(Number(item.unit_price), locale)} ×{" "}
                      {item.quantity}
                    </p>
                    <p className="font-semibold mt-0.5">
                      {formatEGP(Number(item.line_total), locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E5E5E5] space-y-2 text-xs max-w-xs ms-auto">
              <div className="flex justify-between">
                <span className="text-[#777777]">Subtotal</span>
                <span className="tabular-nums">
                  {formatEGP(Number(order.subtotal), locale)}
                </span>
              </div>
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#777777]">
                    Discount {order.discount_code ? `(${order.discount_code})` : ""}
                  </span>
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
              <div className="flex justify-between pt-2 border-t border-black font-semibold text-sm">
                <span>Total (COD)</span>
                <span className="tabular-nums">
                  {formatEGP(Number(order.total_amount), locale)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] pb-3 border-b border-[#E5E5E5]">
              {t("timeline")}
            </h2>
            <div className="space-y-3 text-xs">
              {(order.history ?? []).map((h) => (
                <div
                  key={h.id}
                  className="flex items-start justify-between gap-4 border-b border-[#F5F5F5] pb-2.5"
                >
                  <div>
                    <p className="font-medium uppercase tracking-wider">
                      {h.from_status ? `${ts(h.from_status)} → ` : ""}
                      {ts(h.to_status)}
                    </p>
                    {h.note && <p className="text-[#666666] mt-0.5">{h.note}</p>}
                  </div>
                  <span className="text-[#777777] whitespace-nowrap">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Workflow */}
          <div className="bg-white border border-black p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
              {t("changeStatus")}
            </h2>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              className="w-full h-11 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
            >
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {ts(st)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Status change note (optional)..."
              className="w-full h-10 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
            />
            <Button
              variant="primary"
              fullWidth
              loading={savingStatus}
              onClick={handleStatusUpdate}
            >
              {t("changeStatus")}
            </Button>
          </div>

          {/* Customer & Shipping Info */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-3 text-xs">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] pb-2 border-b border-[#E5E5E5]">
              Customer & Delivery
            </h2>
            <p className="font-semibold text-sm">{order.customer_name}</p>
            <p dir="ltr" className="text-[#555555]">
              {order.customer_phone}
              {order.secondary_phone ? ` / ${order.secondary_phone}` : ""}
            </p>
            {order.customer_email && (
              <p className="text-[#555555]">{order.customer_email}</p>
            )}
            <div className="pt-2 border-t border-[#F0F0F0] space-y-1 text-[#333333]">
              <p className="font-medium">
                {locale === "ar"
                  ? order.governorate_name_ar
                  : order.governorate_name_en}{" "}
                — {order.city}, {order.district}
              </p>
              <p>{order.full_address}</p>
              <p>
                Bld {order.building_number}
                {order.floor ? ` · Floor ${order.floor}` : ""}
                {order.apartment_number
                  ? ` · Apt ${order.apartment_number}`
                  : ""}
              </p>
              {order.delivery_notes && (
                <p className="pt-1 text-[#777777]">
                  Note: {order.delivery_notes}
                </p>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-3">
            <Textarea
              label={t("internalNotes")}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              loading={savingNotes}
              onClick={handleNotesSave}
            >
              {tc("save")}
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Invoice / Packing Slip View */}
      <div className="hidden print:block p-8 bg-white text-black space-y-6">
        <div className="flex justify-between items-start border-b-2 border-black pb-6">
          <div>
            <h1 className="font-serif text-3xl tracking-[0.26em]">ALVERO</h1>
            <p className="text-xs uppercase tracking-widest mt-1">
              {printMode === "packing" ? "PACKING SLIP" : "COMMERCIAL COD INVOICE"}
            </p>
          </div>
          <div className="text-end text-xs space-y-1">
            <p className="font-bold text-sm">{order.order_number}</p>
            <p>{new Date(order.created_at).toLocaleDateString("en-EG")}</p>
            <p>Payment: Cash on Delivery (COD)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-xs">
          <div>
            <p className="font-bold uppercase tracking-wider mb-1">Ship To</p>
            <p>{order.customer_name}</p>
            <p>{order.customer_phone}</p>
            <p>
              {order.governorate_name_en}, {order.city}, {order.district}
            </p>
            <p>
              {order.full_address} — Bld {order.building_number}
            </p>
          </div>
        </div>

        <table className="w-full text-xs border-collapse border border-black">
          <thead>
            <tr className="border-b border-black bg-[#F5F5F5]">
              <th className="p-2 text-start">SKU</th>
              <th className="p-2 text-start">Item</th>
              <th className="p-2 text-start">Variant</th>
              <th className="p-2 text-end">Qty</th>
              {printMode !== "packing" && (
                <>
                  <th className="p-2 text-end">Unit</th>
                  <th className="p-2 text-end">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-[#E5E5E5]">
                <td className="p-2">{item.sku}</td>
                <td className="p-2">{item.product_name_en}</td>
                <td className="p-2">
                  {item.color_name_en} / {item.size}
                </td>
                <td className="p-2 text-end">{item.quantity}</td>
                {printMode !== "packing" && (
                  <>
                    <td className="p-2 text-end">{item.unit_price} EGP</td>
                    <td className="p-2 text-end">{item.line_total} EGP</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {printMode !== "packing" && (
          <div className="text-end text-xs space-y-1 pt-2">
            <p>Subtotal: {order.subtotal} EGP</p>
            <p>Discount: -{order.discount_amount} EGP</p>
            <p>Shipping: {order.shipping_fee} EGP</p>
            <p className="text-base font-bold pt-1">
              Total Due on Delivery: {order.total_amount} EGP
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
