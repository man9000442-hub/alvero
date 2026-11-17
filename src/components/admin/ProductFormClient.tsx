"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Plus, Trash2, Wand2 } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MediaUploader } from "./MediaUploader";
import type { Category, Product } from "@/types/database";

interface VariantRow {
  id?: string;
  size: string;
  color_name_en: string;
  color_name_ar: string;
  color_hex: string;
  sku: string;
  stock_quantity: number;
  price_override: string;
  is_available: boolean;
}

export function ProductFormClient({
  initialProduct,
  categories,
}: {
  initialProduct?: Product | null;
  categories: Category[];
}) {
  const t = useTranslations("admin.products");
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(initialProduct);

  const [nameEn, setNameEn] = useState(initialProduct?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initialProduct?.name_ar ?? "");
  const [slug, setSlug] = useState(initialProduct?.slug ?? "");
  const [sku, setSku] = useState(initialProduct?.sku ?? "");
  const [brand, setBrand] = useState(initialProduct?.brand ?? "ALVERO");
  const [categoryId, setCategoryId] = useState(
    initialProduct?.category_id ?? "",
  );
  const [regularPrice, setRegularPrice] = useState(
    initialProduct ? String(initialProduct.regular_price) : "",
  );
  const [salePrice, setSalePrice] = useState(
    initialProduct?.sale_price !== null &&
      initialProduct?.sale_price !== undefined
      ? String(initialProduct.sale_price)
      : "",
  );
  const [costPrice, setCostPrice] = useState(
    initialProduct?.cost_price !== null &&
      initialProduct?.cost_price !== undefined
      ? String(initialProduct.cost_price)
      : "",
  );
  const [descriptionEn, setDescriptionEn] = useState(
    initialProduct?.description_en ?? "",
  );
  const [descriptionAr, setDescriptionAr] = useState(
    initialProduct?.description_ar ?? "",
  );
  const [detailsEn, setDetailsEn] = useState(initialProduct?.details_en ?? "");
  const [detailsAr, setDetailsAr] = useState(initialProduct?.details_ar ?? "");
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">(
    initialProduct?.status ?? "ACTIVE",
  );
  const [isFeatured, setIsFeatured] = useState(
    initialProduct?.is_featured ?? false,
  );
  const [isNewArrival, setIsNewArrival] = useState(
    initialProduct?.is_new_arrival ?? true,
  );
  const [isBestSeller, setIsBestSeller] = useState(
    initialProduct?.is_best_seller ?? false,
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(initialProduct?.low_stock_threshold ?? 5),
  );
  const [seoTitleEn, setSeoTitleEn] = useState(
    initialProduct?.seo_title_en ?? "",
  );
  const [seoTitleAr, setSeoTitleAr] = useState(
    initialProduct?.seo_title_ar ?? "",
  );
  const [seoDescEn, setSeoDescEn] = useState(
    initialProduct?.seo_description_en ?? "",
  );
  const [seoDescAr, setSeoDescAr] = useState(
    initialProduct?.seo_description_ar ?? "",
  );

  const initialGallery = Array.from(
    new Set(
      [
        initialProduct?.main_image_url,
        initialProduct?.hover_image_url,
        ...(initialProduct?.images ?? []).map((i) => i.url),
      ].filter((u): u is string => Boolean(u)),
    ),
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialGallery);

  const [variants, setVariants] = useState<VariantRow[]>(
    initialProduct?.variants && initialProduct.variants.length > 0
      ? initialProduct.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color_name_en: v.color_name_en,
          color_name_ar: v.color_name_ar,
          color_hex: v.color_hex,
          sku: v.sku,
          stock_quantity: v.stock_quantity,
          price_override:
            v.price_override !== null && v.price_override !== undefined
              ? String(v.price_override)
              : "",
          is_available: v.is_available,
        }))
      : [
          {
            size: "S",
            color_name_en: "Black",
            color_name_ar: "أسود",
            color_hex: "#000000",
            sku: "",
            stock_quantity: 10,
            price_override: "",
            is_available: true,
          },
          {
            size: "M",
            color_name_en: "Black",
            color_name_ar: "أسود",
            color_hex: "#000000",
            sku: "",
            stock_quantity: 10,
            price_override: "",
            is_available: true,
          },
          {
            size: "L",
            color_name_en: "Black",
            color_name_ar: "أسود",
            color_hex: "#000000",
            sku: "",
            stock_quantity: 10,
            price_override: "",
            is_available: true,
          },
        ],
  );

  const [matrixSizes, setMatrixSizes] = useState("S, M, L");
  const [matrixColors, setMatrixColors] = useState(
    "Black|#000000|أسود, White|#FFFFFF|أبيض",
  );
  const [saving, setSaving] = useState(false);

  const autoGenerateSlug = (val: string) => {
    setNameEn(val);
    if (!isEdit) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  const generateMatrix = () => {
    const sizes = matrixSizes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const colors = matrixColors
      .split(",")
      .map((entry) => {
        const [en, hex, ar] = entry.split("|").map((x) => x.trim());
        return {
          en: en || "Black",
          hex: /^#[0-9A-Fa-f]{6}$/.test(hex || "") ? hex : "#000000",
          ar: ar || en || "أسود",
        };
      })
      .filter((c) => c.en);

    const baseSku = (sku || "ALV-PROD").toUpperCase().trim();
    const generated: VariantRow[] = [];
    for (const c of colors) {
      for (const sz of sizes.length > 0 ? sizes : [""]) {
        const cCode = c.en.slice(0, 3).toUpperCase();
        const sCode = (sz || "ONE").toUpperCase();
        generated.push({
          size: sz,
          color_name_en: c.en,
          color_name_ar: c.ar,
          color_hex: c.hex,
          sku: `${baseSku}-${cCode}-${sCode}`,
          stock_quantity: 10,
          price_override: "",
          is_available: true,
        });
      }
    }
    setVariants(generated);
    showToast(`Generated ${generated.length} variants`, "success");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        category_id: categoryId || null,
        slug: slug.trim(),
        sku: sku.trim(),
        brand: brand.trim() || "ALVERO",
        name_en: nameEn.trim(),
        name_ar: nameAr.trim(),
        description_en: descriptionEn,
        description_ar: descriptionAr,
        details_en: detailsEn,
        details_ar: detailsAr,
        regular_price: Number(regularPrice),
        sale_price: salePrice.trim() ? Number(salePrice) : null,
        cost_price: costPrice.trim() ? Number(costPrice) : null,
        main_image_url: galleryUrls[0] || null,
        hover_image_url: galleryUrls[1] || null,
        gallery_urls: galleryUrls,
        status,
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        is_best_seller: isBestSeller,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        seo_title_en: seoTitleEn || null,
        seo_title_ar: seoTitleAr || null,
        seo_description_en: seoDescEn || null,
        seo_description_ar: seoDescAr || null,
        variants: variants.map((v, idx) => ({
          id: v.id,
          size: v.size,
          color_name_en: v.color_name_en,
          color_name_ar: v.color_name_ar,
          color_hex: v.color_hex,
          sku: v.sku.trim() || `${sku.trim()}-${idx + 1}`,
          stock_quantity: Number(v.stock_quantity) || 0,
          price_override: v.price_override.trim()
            ? Number(v.price_override)
            : null,
          is_available: v.is_available,
        })),
      };

      const url = isEdit
        ? `/api/admin/products/${initialProduct!.id}`
        : "/api/admin/products";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save product", "error");
        return;
      }

      showToast("Product saved successfully", "success");
      router.push("/admin/products");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="p-2 border border-[#E5E5E5] hover:border-black bg-white"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
            {isEdit ? t("editProduct") : t("addProduct")}
          </h1>
        </div>
        <Button type="submit" variant="primary" size="md" loading={saving}>
          {t("saveProduct")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t("nameEn")}
                required
                value={nameEn}
                onChange={(e) => autoGenerateSlug(e.target.value)}
              />
              <Input
                label={t("nameAr")}
                required
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
              />
              <Input
                label={t("slug")}
                required
                dir="ltr"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <Input
                label={t("sku")}
                required
                dir="ltr"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label={t("descriptionEn")}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
              />
              <Textarea
                label={t("descriptionAr")}
                dir="rtl"
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
              />
              <Textarea
                label={t("detailsEn")}
                value={detailsEn}
                onChange={(e) => setDetailsEn(e.target.value)}
              />
              <Textarea
                label={t("detailsAr")}
                dir="rtl"
                value={detailsAr}
                onChange={(e) => setDetailsAr(e.target.value)}
              />
            </div>
          </div>

          {/* Media Uploader */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
                {t("images")}
              </h2>
              <MediaUploader
                folder="products"
                onUploaded={(url) => setGalleryUrls((prev) => [...prev, url])}
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or paste image URL and press Add..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = e.currentTarget.value.trim();
                    if (v) {
                      setGalleryUrls((prev) => [...prev, v]);
                      e.currentTarget.value = "";
                    }
                  }
                }}
                className="flex-1 h-10 px-3 border border-[#E5E5E5] text-xs bg-white"
              />
            </div>

            {galleryUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {galleryUrls.map((url, idx) => (
                  <div
                    key={url + idx}
                    className="relative aspect-[3/4] border border-[#E5E5E5] bg-[#F5F5F5]"
                  >
                    <Image
                      src={url}
                      alt={`Product ${idx + 1}`}
                      fill
                      sizes="140px"
                      className="object-cover"
                    />
                    <span className="absolute top-1.5 start-1.5 bg-black text-white text-[9px] px-1.5 py-0.5 uppercase">
                      {idx === 0 ? "Main" : idx === 1 ? "Hover" : `#${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGalleryUrls((prev) =>
                          prev.filter((_, i) => i !== idx),
                        )
                      }
                      className="absolute top-1.5 end-1.5 bg-white border border-black p-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variants Matrix & Table */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
                {t("variants")}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    {
                      size: "M",
                      color_name_en: "Black",
                      color_name_ar: "أسود",
                      color_hex: "#000000",
                      sku: `${sku || "ALV"}-${prev.length + 1}`,
                      stock_quantity: 0,
                      price_override: "",
                      is_available: true,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs uppercase tracking-wider border border-black px-3 py-1.5 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Variant
              </button>
            </div>

            <div className="bg-[#FAFAFA] border border-[#E5E5E5] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <Input
                label="Sizes (comma separated)"
                value={matrixSizes}
                onChange={(e) => setMatrixSizes(e.target.value)}
              />
              <Input
                label="Colors (Name|Hex|Arabic)"
                value={matrixColors}
                onChange={(e) => setMatrixColors(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={generateMatrix}
              >
                <Wand2 className="h-3.5 w-3.5" />
                {t("generateVariants")}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-[#E5E5E5] text-[10px] uppercase tracking-wider text-[#777777]">
                  <tr>
                    <th className="py-2 px-2 text-start">Color (EN/AR)</th>
                    <th className="py-2 px-2 text-start">Hex</th>
                    <th className="py-2 px-2 text-start">Size</th>
                    <th className="py-2 px-2 text-start">SKU</th>
                    <th className="py-2 px-2 text-start">Stock</th>
                    <th className="py-2 px-2 text-start">Price Override</th>
                    <th className="py-2 px-2 text-start">Avail</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {variants.map((v, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 space-y-1">
                        <input
                          value={v.color_name_en}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx].color_name_en = e.target.value;
                            setVariants(next);
                          }}
                          className="w-24 h-8 px-2 border border-[#E5E5E5]"
                        />
                        <input
                          value={v.color_name_ar}
                          dir="rtl"
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx].color_name_ar = e.target.value;
                            setVariants(next);
                          }}
                          className="w-24 h-8 px-2 border border-[#E5E5E5] block"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="color"
                          value={v.color_hex}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx].color_hex = e.target.value;
                            setVariants(next);
                          }}
                          className="w-8 h-8 p-0 border border-[#E5E5E5]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          value={v.size}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx].size = e.target.value;
                            setVariants(next);
                          }}
                          className="w-16 h-8 px-2 border border-[#E5E5E5]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          value={v.sku}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx].sku = e.target.value;
                            setVariants(next);
                          }}
                          className="w-36 h-8 px-2 border border-[#E5E5E5]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          value={v.stock_quantity}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx].stock_quantity = Number(e.target.value);
                            setVariants(next);
                          }}
                          className="w-16 h-8 px-2 border border-[#E5E5E5]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="—"
                          value={v.price_override}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx].price_override = e.target.value;
                            setVariants(next);
                          }}
                          className="w-20 h-8 px-2 border border-[#E5E5E5]"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={v.is_available}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx].is_available = e.target.checked;
                            setVariants(next);
                          }}
                          className="accent-black"
                        />
                      </td>
                      <td className="py-2 px-2">
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setVariants((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="p-1 text-[#777777] hover:text-black cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <Select
              label={t("status")}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "DRAFT" | "ACTIVE" | "ARCHIVED")
              }
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </Select>

            <Select
              label={t("category")}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en} / {c.name_ar}
                </option>
              ))}
            </Select>

            <Input
              label={t("brand")}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />

            <div className="space-y-2 pt-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="accent-black"
                />
                {t("featured")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewArrival}
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                  className="accent-black"
                />
                {t("newArrival")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBestSeller}
                  onChange={(e) => setIsBestSeller(e.target.checked)}
                  className="accent-black"
                />
                {t("bestSeller")}
              </label>
            </div>
          </div>

          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <Input
              label={t("regularPrice")}
              type="number"
              min={0}
              step="0.01"
              required
              value={regularPrice}
              onChange={(e) => setRegularPrice(e.target.value)}
            />
            <Input
              label={t("salePrice")}
              type="number"
              min={0}
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
            <Input
              label={t("costPrice")}
              type="number"
              min={0}
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
            <Input
              label="Low Stock Alert Threshold"
              type="number"
              min={0}
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
          </div>

          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
              {t("seo")}
            </h2>
            <Input
              label="SEO Title (EN)"
              value={seoTitleEn}
              onChange={(e) => setSeoTitleEn(e.target.value)}
            />
            <Input
              label="SEO Title (AR)"
              dir="rtl"
              value={seoTitleAr}
              onChange={(e) => setSeoTitleAr(e.target.value)}
            />
            <Textarea
              label="SEO Description (EN)"
              value={seoDescEn}
              onChange={(e) => setSeoDescEn(e.target.value)}
            />
            <Textarea
              label="SEO Description (AR)"
              dir="rtl"
              value={seoDescAr}
              onChange={(e) => setSeoDescAr(e.target.value)}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
