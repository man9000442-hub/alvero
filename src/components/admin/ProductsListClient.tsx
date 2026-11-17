"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Copy, Edit, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Pagination } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { formatEGP } from "@/lib/pricing";
import type { Locale, Product } from "@/types/database";

export function ProductsListClient({
  products,
  totalCount,
  page,
  pageSize,
  filters,
}: {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: { search?: string; status?: string };
}) {
  const t = useTranslations("admin.products");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();

  const [search, setSearch] = useState(filters.search ?? "");
  const [status, setStatus] = useState(filters.status ?? "ALL");

  const applyFilter = (nextPage = 1) => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("search", search.trim());
    if (status && status !== "ALL") qs.set("status", status);
    if (nextPage > 1) qs.set("page", String(nextPage));
    router.push(`/admin/products?${qs.toString()}`);
  };

  const quickToggle = async (
    id: string,
    payload: Record<string, unknown>,
  ) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quickPatch: true, ...payload }),
    });
    if (res.ok) {
      showToast("Product updated", "success");
      router.refresh();
    } else {
      showToast("Update failed", "error");
    }
  };

  const duplicateProduct = async (id: string) => {
    const res = await fetch(`/api/admin/products/${id}/duplicate`, {
      method: "POST",
    });
    if (res.ok) {
      showToast("Product duplicated as Draft", "success");
      router.refresh();
    } else {
      showToast("Duplicate failed", "error");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Archive and delete this product?")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Product archived", "success");
      router.refresh();
    } else {
      showToast("Delete failed", "error");
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("title")}
        </h1>
        <Link href="/admin/products/new">
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" />
            {t("addProduct")}
          </Button>
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilter(1);
        }}
        className="bg-white border border-[#E5E5E5] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or SKU..."
          className="h-10 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
        >
          <option value="ALL">{tc("all")}</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <Button type="submit" variant="primary" size="sm" fullWidth>
          <Search className="h-3.5 w-3.5" />
          {tc("filter")}
        </Button>
      </form>

      {products.length === 0 ? (
        <EmptyState
          title={tc("noResults")}
          action={
            <Link href="/admin/products/new">
              <Button variant="primary" size="sm">
                {t("addProduct")}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] uppercase tracking-[0.14em] text-[#777777]">
              <tr>
                <th className="py-3.5 px-4 text-start">Product</th>
                <th className="py-3.5 px-4 text-start">SKU</th>
                <th className="py-3.5 px-4 text-start">Price</th>
                <th className="py-3.5 px-4 text-start">Stock</th>
                <th className="py-3.5 px-4 text-start">Status</th>
                <th className="py-3.5 px-4 text-start">Flags</th>
                <th className="py-3.5 px-4 text-end">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0]">
              {products.map((p) => {
                const totalStock = (p.variants ?? []).reduce(
                  (acc, v) => acc + v.stock_quantity,
                  0,
                );
                return (
                  <tr key={p.id} className="hover:bg-[#FAFAFA]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-13 bg-[#F3F3F3] border border-[#E5E5E5] shrink-0">
                          {p.main_image_url && (
                            <Image
                              src={p.main_image_url}
                              alt={p.name_en}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="font-medium hover:underline block truncate max-w-[220px]"
                          >
                            {locale === "ar" ? p.name_ar : p.name_en}
                          </Link>
                          <span className="text-[11px] text-[#777777]">
                            {p.category
                              ? locale === "ar"
                                ? p.category.name_ar
                                : p.category.name_en
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#555555]">{p.sku}</td>
                    <td className="py-3 px-4 tabular-nums">
                      <span className="font-semibold">
                        {formatEGP(
                          Number(p.sale_price ?? p.regular_price),
                          locale,
                        )}
                      </span>
                      {p.sale_price !== null && (
                        <span className="block text-[10px] text-[#777777] line-through">
                          {formatEGP(Number(p.regular_price), locale)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 tabular-nums">
                      {totalStock} ({p.variants?.length ?? 0} vars)
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          quickToggle(p.id, {
                            status: p.status === "ACTIVE" ? "DRAFT" : "ACTIVE",
                          })
                        }
                        className="cursor-pointer"
                      >
                        <Badge
                          variant={p.status === "ACTIVE" ? "solid" : "outline"}
                        >
                          {p.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3 px-4 space-x-1 space-y-1">
                      <button
                        type="button"
                        onClick={() =>
                          quickToggle(p.id, { is_featured: !p.is_featured })
                        }
                        className={`px-2 py-0.5 text-[10px] border cursor-pointer ${
                          p.is_featured
                            ? "bg-black text-white border-black"
                            : "border-[#E5E5E5] text-[#777777]"
                        }`}
                      >
                        Featured
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          quickToggle(p.id, {
                            is_new_arrival: !p.is_new_arrival,
                          })
                        }
                        className={`px-2 py-0.5 text-[10px] border cursor-pointer ${
                          p.is_new_arrival
                            ? "bg-black text-white border-black"
                            : "border-[#E5E5E5] text-[#777777]"
                        }`}
                      >
                        New
                      </button>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="p-1.5 border border-[#E5E5E5] hover:border-black"
                          title={tc("edit")}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => duplicateProduct(p.id)}
                          className="p-1.5 border border-[#E5E5E5] hover:border-black cursor-pointer"
                          title={tc("duplicate")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(p.id)}
                          className="p-1.5 border border-[#E5E5E5] hover:border-black cursor-pointer"
                          title={tc("delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(next) => applyFilter(next)}
        prevLabel={tc("previous")}
        nextLabel={tc("next")}
      />
    </div>
  );
}
