"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { Locale } from "@/types/database";

interface VariantItem {
  id: string;
  sku: string;
  size: string;
  color_name_en: string;
  color_name_ar: string;
  stock_quantity: number;
  is_available: boolean;
  product: {
    id: string;
    name_en: string;
    name_ar: string;
    low_stock_threshold: number;
  };
}

interface MovementItem {
  id: string;
  sku: string;
  movement_type: string;
  quantity_delta: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  created_at: string;
}

export function InventoryClient({
  variants,
  movements,
  initialFilter = "all",
}: {
  variants: VariantItem[];
  movements: MovementItem[];
  initialFilter?: string;
}) {
  const t = useTranslations("admin.nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();

  const [filter, setFilter] = useState(initialFilter);
  const [selected, setSelected] = useState<VariantItem | null>(null);
  const [newQty, setNewQty] = useState("0");
  const [movementType, setMovementType] = useState<
    "MANUAL_ADJUSTMENT" | "RESTOCK"
  >("RESTOCK");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return variants.filter((v) => {
      const thresh = v.product?.low_stock_threshold ?? 5;
      if (filter === "out") return v.stock_quantity === 0 || !v.is_available;
      if (filter === "low")
        return v.stock_quantity > 0 && v.stock_quantity <= thresh;
      return true;
    });
  }, [variants, filter]);

  const openAdjust = (v: VariantItem) => {
    setSelected(v);
    setNewQty(String(v.stock_quantity));
    setMovementType("RESTOCK");
    setReason("");
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: selected.id,
          newQuantity: Number(newQty),
          movementType,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Adjustment failed", "error");
        return;
      }
      setSelected(null);
      showToast("Stock adjusted and logged", "success");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("inventory")}
        </h1>
        <div className="flex gap-2">
          {[
            { key: "all", label: "All Variants" },
            { key: "low", label: "Low Stock" },
            { key: "out", label: "Out of Stock" },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilter(btn.key)}
              className={`h-9 px-3.5 text-xs uppercase tracking-wider border cursor-pointer ${
                filter === btn.key
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-[#E5E5E5]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] uppercase tracking-[0.14em] text-[#777777]">
            <tr>
              <th className="py-3.5 px-4 text-start">Product</th>
              <th className="py-3.5 px-4 text-start">SKU</th>
              <th className="py-3.5 px-4 text-start">Variant</th>
              <th className="py-3.5 px-4 text-start">Stock</th>
              <th className="py-3.5 px-4 text-start">Alert</th>
              <th className="py-3.5 px-4 text-end">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {filtered.map((v) => {
              const thresh = v.product?.low_stock_threshold ?? 5;
              const isOut = v.stock_quantity === 0;
              const isLow = !isOut && v.stock_quantity <= thresh;

              return (
                <tr key={v.id}>
                  <td className="py-3 px-4 font-medium">
                    {locale === "ar"
                      ? v.product?.name_ar
                      : v.product?.name_en}
                  </td>
                  <td className="py-3 px-4 text-[#666666]">{v.sku}</td>
                  <td className="py-3 px-4">
                    {locale === "ar" ? v.color_name_ar : v.color_name_en} /{" "}
                    {v.size}
                  </td>
                  <td className="py-3 px-4 font-semibold tabular-nums">
                    {v.stock_quantity}
                  </td>
                  <td className="py-3 px-4">
                    {isOut ? (
                      <Badge variant="solid">Out of Stock</Badge>
                    ) : isLow ? (
                      <Badge variant="outline">Low Stock</Badge>
                    ) : (
                      <Badge variant="subtle">Healthy</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAdjust(v)}
                    >
                      Adjust
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Movement History */}
      <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
          Inventory Movement Ledger
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-[#E5E5E5] text-[10px] uppercase tracking-wider text-[#777777]">
              <tr>
                <th className="py-2.5 px-3 text-start">Date</th>
                <th className="py-2.5 px-3 text-start">SKU</th>
                <th className="py-2.5 px-3 text-start">Type</th>
                <th className="py-2.5 px-3 text-start">Delta</th>
                <th className="py-2.5 px-3 text-start">Balance</th>
                <th className="py-2.5 px-3 text-start">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F3F3]">
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 px-3 text-[#777777] whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{m.sku}</td>
                  <td className="py-2.5 px-3">{m.movement_type}</td>
                  <td className="py-2.5 px-3 tabular-nums font-semibold">
                    {m.quantity_delta > 0
                      ? `+${m.quantity_delta}`
                      : m.quantity_delta}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums">
                    {m.previous_quantity} → {m.new_quantity}
                  </td>
                  <td className="py-2.5 px-3 text-[#555555]">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={`Adjust Stock — ${selected?.sku ?? ""}`}
      >
        <form onSubmit={handleAdjust} className="space-y-4">
          <Select
            label="Adjustment Type"
            value={movementType}
            onChange={(e) =>
              setMovementType(
                e.target.value as "MANUAL_ADJUSTMENT" | "RESTOCK",
              )
            }
          >
            <option value="RESTOCK">Restock</option>
            <option value="MANUAL_ADJUSTMENT">Manual Stock Count / Fix</option>
          </Select>
          <Input
            label="New Quantity"
            type="number"
            min={0}
            required
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
          />
          <Input
            label="Reason (Required for Audit)"
            required
            placeholder="e.g. Studio shipment received, physical count correction"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button type="submit" variant="primary" fullWidth loading={saving}>
            Confirm Stock Adjustment
          </Button>
        </form>
      </Modal>
    </div>
  );
}
