"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { ProductCard } from "./ProductCard";
import { EmptyState, Pagination } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Modal";
import type { Category, Locale, Product } from "@/types/database";

interface ShopCatalogClientProps {
  products: Product[];
  totalCount: number;
  page: number;
  totalPages: number;
  categories: Category[];
  availableSizes: string[];
  availableColors: { name_en: string; name_ar: string; hex: string }[];
  currentFilters: {
    search?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    size?: string;
    color?: string;
    inStock?: boolean;
    sort?: string;
  };
}

export function ShopCatalogClient({
  products,
  totalCount,
  page,
  totalPages,
  categories,
  availableSizes,
  availableColors,
  currentFilters,
}: ShopCatalogClientProps) {
  const t = useTranslations("shop");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchVal, setSearchVal] = useState(currentFilters.search ?? "");
  const [minPrice, setMinPrice] = useState(currentFilters.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice ?? "");

  const pushFilter = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      search: currentFilters.search,
      category: currentFilters.category,
      minPrice: currentFilters.minPrice,
      maxPrice: currentFilters.maxPrice,
      size: currentFilters.size,
      color: currentFilters.color,
      inStock: currentFilters.inStock ? "true" : undefined,
      sort: currentFilters.sort,
      ...updates,
    };

    if (!("page" in updates)) {
      delete merged.page;
    }

    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "") {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    router.push(qs ? `/shop?${qs}` : "/shop");
  };

  const applyPriceAndSearch = (e: React.FormEvent) => {
    e.preventDefault();
    pushFilter({
      search: searchVal.trim() || undefined,
      minPrice: minPrice.trim() || undefined,
      maxPrice: maxPrice.trim() || undefined,
    });
    setMobileFiltersOpen(false);
  };

  const clearAll = () => {
    setSearchVal("");
    setMinPrice("");
    setMaxPrice("");
    router.push("/shop");
    setMobileFiltersOpen(false);
  };

  const hasActiveFilters = Boolean(
    currentFilters.search ||
      currentFilters.category ||
      currentFilters.minPrice ||
      currentFilters.maxPrice ||
      currentFilters.size ||
      currentFilters.color ||
      currentFilters.inStock,
  );

  const filterPanel = (
    <div className="space-y-8">
      {/* Search */}
      <form onSubmit={applyPriceAndSearch} className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black">
          {t("searchLabel")}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 h-10 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
          />
          <button
            type="submit"
            className="h-10 px-3 bg-black text-white text-[10px] uppercase tracking-widest cursor-pointer"
          >
            {tc("search")}
          </button>
        </div>
      </form>

      {/* Categories */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black">
          {t("category")}
        </p>
        <ul className="space-y-1.5 text-xs">
          <li>
            <button
              type="button"
              onClick={() => pushFilter({ category: undefined })}
              className={`cursor-pointer hover:underline ${
                !currentFilters.category
                  ? "font-semibold text-black underline underline-offset-4"
                  : "text-[#666666]"
              }`}
            >
              {t("allCategories")}
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => {
                  pushFilter({ category: cat.slug });
                  setMobileFiltersOpen(false);
                }}
                className={`cursor-pointer hover:underline ${
                  currentFilters.category === cat.slug
                    ? "font-semibold text-black underline underline-offset-4"
                    : "text-[#666666]"
                }`}
              >
                {locale === "ar" ? cat.name_ar : cat.name_en}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Size */}
      {availableSizes.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black">
            {t("size")}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((sz) => {
              const active = currentFilters.size === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() =>
                    pushFilter({ size: active ? undefined : sz })
                  }
                  className={`h-8 min-w-[38px] px-2.5 text-[11px] border transition-colors cursor-pointer ${
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-[#E5E5E5] hover:border-black"
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color */}
      {availableColors.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black">
            {t("color")}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {availableColors.map((col) => {
              const active =
                currentFilters.color?.toLowerCase() ===
                col.name_en.toLowerCase();
              return (
                <button
                  key={col.name_en}
                  type="button"
                  onClick={() =>
                    pushFilter({
                      color: active ? undefined : col.name_en,
                    })
                  }
                  title={locale === "ar" ? col.name_ar : col.name_en}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[11px] cursor-pointer ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-[#E5E5E5] bg-white text-black hover:border-black"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-[#CCCCCC]"
                    style={{ backgroundColor: col.hex }}
                  />
                  <span>{locale === "ar" ? col.name_ar : col.name_en}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range */}
      <form onSubmit={applyPriceAndSearch} className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black">
          {t("priceRange")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={t("minPrice")}
            className="h-9 px-2.5 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
          />
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={t("maxPrice")}
            className="h-9 px-2.5 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white"
          />
        </div>
        <button
          type="submit"
          className="w-full h-9 border border-black text-[10px] uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          {tc("filter")}
        </button>
      </form>

      {/* Availability */}
      <label className="flex items-center gap-2.5 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(currentFilters.inStock)}
          onChange={(e) =>
            pushFilter({ inStock: e.target.checked ? "true" : undefined })
          }
          className="h-4 w-4 accent-black"
        />
        <span>{t("inStockOnly")}</span>
      </label>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" fullWidth onClick={clearAll}>
          <X className="h-3.5 w-3.5" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
      {/* Header & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-[#E5E5E5]">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl uppercase tracking-[0.12em] text-black">
            {t("title")}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#777777]">
            {t("subtitle")} · {t("showingCount", { count: totalCount })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 h-10 px-4 border border-black text-xs uppercase tracking-[0.14em] bg-white cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {tc("filter")}
          </button>

          <select
            aria-label={t("sortBy")}
            value={currentFilters.sort ?? "newest"}
            onChange={(e) => pushFilter({ sort: e.target.value })}
            className="h-10 px-3.5 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs bg-white uppercase tracking-wider cursor-pointer"
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="price_asc">{t("sortPriceAsc")}</option>
            <option value="price_desc">{t("sortPriceDesc")}</option>
            <option value="popularity">{t("sortPopularity")}</option>
            <option value="best_sellers">{t("sortBestSellers")}</option>
          </select>
        </div>
      </div>

      {/* Main Layout */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="hidden lg:block lg:col-span-3">{filterPanel}</aside>

        <div className="lg:col-span-9">
          {products.length === 0 ? (
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDesc")}
              action={
                hasActiveFilters ? (
                  <Button variant="primary" size="sm" onClick={clearAll}>
                    {t("clearFilters")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(nextPage) =>
                  pushFilter({ page: String(nextPage) })
                }
                prevLabel={tc("previous")}
                nextLabel={tc("next")}
              />
            </>
          )}
        </div>
      </div>

      <Drawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title={tc("filter")}
        side="start"
      >
        <div className="p-6">{filterPanel}</div>
      </Drawer>
    </div>
  );
}
