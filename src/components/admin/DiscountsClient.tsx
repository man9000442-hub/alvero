"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatEGP } from "@/lib/pricing";
import type { Category, Discount, Locale, Product } from "@/types/database";

export function DiscountsClient({
  discounts,
  products,
  categories,
}: {
  discounts: Discount[];
  products: Product[];
  categories: Category[];
}) {
  const t = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [isAutomatic, setIsAutomatic] = useState(false);
  const [code, setCode] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [discountType, setDiscountType] = useState<
    "PERCENTAGE" | "FIXED_AMOUNT"
  >("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("20");
  const [scope, setScope] = useState<"STORE_WIDE" | "PRODUCTS" | "CATEGORIES">(
    "STORE_WIDE",
  );
  const [minOrder, setMinOrder] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [perCustomerLimit, setPerCustomerLimit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setIsAutomatic(false);
    setCode("");
    setNameEn("");
    setNameAr("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("15");
    setScope("STORE_WIDE");
    setMinOrder("0");
    setMaxDiscount("");
    setStartsAt("");
    setExpiresAt("");
    setUsageLimit("");
    setPerCustomerLimit("");
    setIsActive(true);
    setSelectedProducts([]);
    setSelectedCategories([]);
    setModalOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditing(d);
    setIsAutomatic(d.is_automatic);
    setCode(d.code ?? "");
    setNameEn(d.name_en);
    setNameAr(d.name_ar);
    setDiscountType(d.discount_type);
    setDiscountValue(String(d.discount_value));
    setScope(d.scope);
    setMinOrder(String(d.min_order_amount));
    setMaxDiscount(
      d.max_discount_amount !== null ? String(d.max_discount_amount) : "",
    );
    setStartsAt(d.starts_at ? d.starts_at.slice(0, 16) : "");
    setExpiresAt(d.expires_at ? d.expires_at.slice(0, 16) : "");
    setUsageLimit(d.usage_limit !== null ? String(d.usage_limit) : "");
    setPerCustomerLimit(
      d.per_customer_limit !== null ? String(d.per_customer_limit) : "",
    );
    setIsActive(d.is_active);
    setSelectedProducts(d.product_ids ?? []);
    setSelectedCategories(d.category_ids ?? []);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing
        ? `/api/admin/discounts/${editing.id}`
        : "/api/admin/discounts";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_automatic: isAutomatic,
          code: isAutomatic ? null : code.trim().toUpperCase(),
          name_en: nameEn.trim(),
          name_ar: nameAr.trim(),
          discount_type: discountType,
          discount_value: Number(discountValue),
          scope,
          min_order_amount: Number(minOrder) || 0,
          max_discount_amount: maxDiscount ? Number(maxDiscount) : null,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          usage_limit: usageLimit ? Number(usageLimit) : null,
          per_customer_limit: perCustomerLimit
            ? Number(perCustomerLimit)
            : null,
          is_active: isActive,
          product_ids: selectedProducts,
          category_ids: selectedCategories,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Save failed", "error");
        return;
      }
      setModalOpen(false);
      showToast("Discount saved", "success");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;
    const res = await fetch(`/api/admin/discounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Discount deleted", "success");
      router.refresh();
    }
  };

  const toggleActive = async (d: Discount) => {
    const res = await fetch(`/api/admin/discounts/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toggleOnly: true, is_active: !d.is_active }),
    });
    if (res.ok) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("discounts")}
        </h1>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          {tc("create")}
        </Button>
      </div>

      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] uppercase tracking-[0.14em] text-[#777777]">
            <tr>
              <th className="py-3.5 px-4 text-start">Code / Type</th>
              <th className="py-3.5 px-4 text-start">Title</th>
              <th className="py-3.5 px-4 text-start">Value</th>
              <th className="py-3.5 px-4 text-start">Scope</th>
              <th className="py-3.5 px-4 text-start">Usage</th>
              <th className="py-3.5 px-4 text-start">Status</th>
              <th className="py-3.5 px-4 text-end">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {discounts.map((d) => (
              <tr key={d.id}>
                <td className="py-3 px-4 font-semibold">
                  {d.is_automatic ? (
                    <Badge variant="outline">AUTO PROMO</Badge>
                  ) : (
                    d.code
                  )}
                </td>
                <td className="py-3 px-4">
                  {locale === "ar" ? d.name_ar : d.name_en}
                </td>
                <td className="py-3 px-4 tabular-nums">
                  {d.discount_type === "PERCENTAGE"
                    ? `${d.discount_value}%`
                    : formatEGP(d.discount_value, locale)}
                </td>
                <td className="py-3 px-4">{d.scope}</td>
                <td className="py-3 px-4 tabular-nums">
                  {d.usage_count}
                  {d.usage_limit ? ` / ${d.usage_limit}` : ""}
                </td>
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleActive(d)}
                    className="cursor-pointer"
                  >
                    <Badge variant={d.is_active ? "solid" : "subtle"}>
                      {d.is_active ? tc("active") : tc("inactive")}
                    </Badge>
                  </button>
                </td>
                <td className="py-3 px-4 text-end space-x-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
                    className="p-1.5 border border-[#E5E5E5] hover:border-black cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(d.id)}
                    className="p-1.5 border border-[#E5E5E5] hover:border-black cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? tc("edit") : tc("create")}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isAutomatic}
              onChange={(e) => setIsAutomatic(e.target.checked)}
              className="accent-black"
            />
            Automatic Promotion (no coupon code required)
          </label>

          {!isAutomatic && (
            <Input
              label="Discount Code"
              required={!isAutomatic}
              placeholder="ALVERO20"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Name (EN)"
              required
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
            <Input
              label="Name (AR)"
              required
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
            />
            <Select
              label="Discount Type"
              value={discountType}
              onChange={(e) =>
                setDiscountType(
                  e.target.value as "PERCENTAGE" | "FIXED_AMOUNT",
                )
              }
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED_AMOUNT">Fixed Amount (EGP)</option>
            </Select>
            <Input
              label="Value"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
            <Select
              label="Scope"
              value={scope}
              onChange={(e) =>
                setScope(
                  e.target.value as "STORE_WIDE" | "PRODUCTS" | "CATEGORIES",
                )
              }
            >
              <option value="STORE_WIDE">Store-Wide</option>
              <option value="PRODUCTS">Specific Products</option>
              <option value="CATEGORIES">Specific Categories</option>
            </Select>
            <Input
              label="Minimum Order Amount (EGP)"
              type="number"
              min={0}
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
            />
            <Input
              label="Max Discount Cap (EGP)"
              type="number"
              min={0}
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
            />
            <Input
              label="Global Usage Limit"
              type="number"
              min={1}
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
            />
            <Input
              label="Per-Customer Limit"
              type="number"
              min={1}
              value={perCustomerLimit}
              onChange={(e) => setPerCustomerLimit(e.target.value)}
            />
            <Input
              label="Starts At"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <Input
              label="Expires At"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          {scope === "PRODUCTS" && (
            <div className="border border-[#E5E5E5] p-3 max-h-40 overflow-y-auto space-y-1.5 text-xs">
              <p className="font-semibold uppercase tracking-wider text-[10px] text-[#777777]">
                Select Eligible Products
              </p>
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(p.id)}
                    onChange={(e) =>
                      setSelectedProducts((prev) =>
                        e.target.checked
                          ? [...prev, p.id]
                          : prev.filter((id) => id !== p.id),
                      )
                    }
                    className="accent-black"
                  />
                  <span>{p.name_en}</span>
                </label>
              ))}
            </div>
          )}

          {scope === "CATEGORIES" && (
            <div className="border border-[#E5E5E5] p-3 max-h-40 overflow-y-auto space-y-1.5 text-xs">
              <p className="font-semibold uppercase tracking-wider text-[10px] text-[#777777]">
                Select Eligible Categories
              </p>
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(c.id)}
                    onChange={(e) =>
                      setSelectedCategories((prev) =>
                        e.target.checked
                          ? [...prev, c.id]
                          : prev.filter((id) => id !== c.id),
                      )
                    }
                    className="accent-black"
                  />
                  <span>{c.name_en}</span>
                </label>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-black"
            />
            Active
          </label>

          <Button type="submit" variant="primary" fullWidth loading={saving}>
            {tc("save")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
