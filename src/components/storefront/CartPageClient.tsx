"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { formatEGP, resolveProductEffectivePrice } from "@/lib/pricing";
import { useCart } from "./CartProvider";
import type { Locale, ProductVariant, StorefrontCopy } from "@/types/database";

interface ProductVariantMap {
  [productId: string]: ProductVariant[];
}

export function CartPageClient({ copy }: { copy?: StorefrontCopy }) {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const { showToast } = useToast();
  const {
    items,
    subtotal,
    isHydrated,
    updateQuantity,
    removeItem,
    replaceVariant,
  } = useCart();

  const codNoticeText =
    (locale === "ar" ? copy?.cart_cod_notice_ar : copy?.cart_cod_notice_en) ||
    t("codNotice");

  const [variantsByProduct, setVariantsByProduct] = useState<ProductVariantMap>({});

  useEffect(() => {
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    if (productIds.length === 0) return;
    fetch(`/api/products/variants?ids=${encodeURIComponent(productIds.join(","))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.variantsByProduct) {
          setVariantsByProduct(data.variantsByProduct);
        }
      })
      .catch(() => {});
  }, [items]);

  if (!isHydrated) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16">
        <div className="h-64 bg-[#F3F3F3] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
      <h1 className="font-serif text-3xl sm:text-4xl uppercase tracking-[0.12em] text-black pb-6 border-b border-[#E5E5E5]">
        {t("title")}
      </h1>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDesc")}
            icon={<ShoppingBag className="h-9 w-9 stroke-[1.2]" />}
            action={
              <Link href="/shop">
                <Button variant="primary">{t("continueShopping")}</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {items.map((item) => {
              const name = locale === "ar" ? item.name_ar : item.name_en;
              const productVariants = variantsByProduct[item.productId] ?? [];
              const availableVariants = productVariants.filter(
                (v) => v.is_available && v.stock_quantity > 0,
              );

              return (
                <div
                  key={item.variantId}
                  className="py-6 flex flex-col sm:flex-row gap-5"
                >
                  <Link
                    href={`/products/${item.slug}`}
                    className="relative w-24 h-32 bg-[#F5F5F5] border border-[#E5E5E5] shrink-0 overflow-hidden"
                  >
                    {item.image_url && (
                      <Image
                        src={item.image_url}
                        alt={name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    )}
                  </Link>

                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/products/${item.slug}`}
                          className="text-sm font-medium uppercase tracking-wider text-black hover:underline"
                        >
                          {name}
                        </Link>
                        <p className="mt-1 text-xs text-[#777777]">
                          SKU: {item.sku} · {formatEGP(item.unit_price, locale)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeItem(item.variantId);
                          showToast(t("itemRemoved"), "info");
                        }}
                        className="text-xs text-[#777777] hover:text-black inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t("remove")}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Variant selector (Color / Size swap directly in Cart) */}
                        {availableVariants.length > 1 ? (
                          <select
                            value={item.variantId}
                            onChange={(e) => {
                              const nextVar = availableVariants.find(
                                (v) => v.id === e.target.value,
                              );
                              if (!nextVar) return;
                              const { unitPrice, regularPrice } =
                                resolveProductEffectivePrice(
                                  {
                                    regular_price: item.regular_price,
                                    sale_price:
                                      item.unit_price < item.regular_price
                                        ? item.unit_price
                                        : null,
                                  },
                                  nextVar,
                                );
                              replaceVariant(item.variantId, {
                                ...item,
                                variantId: nextVar.id,
                                sku: nextVar.sku,
                                size: nextVar.size,
                                color_name_en: nextVar.color_name_en,
                                color_name_ar: nextVar.color_name_ar,
                                color_hex: nextVar.color_hex,
                                unit_price: unitPrice,
                                regular_price: regularPrice,
                                stock_quantity: nextVar.stock_quantity,
                                quantity: Math.min(
                                  item.quantity,
                                  nextVar.stock_quantity,
                                ),
                              });
                              showToast(t("itemUpdated"), "success");
                            }}
                            className="h-9 px-3 border border-[#E5E5E5] bg-white text-xs focus:border-black focus:outline-none"
                          >
                            {availableVariants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {locale === "ar"
                                  ? v.color_name_ar
                                  : v.color_name_en}{" "}
                                / {v.size}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-[#555555]">
                            {locale === "ar"
                              ? item.color_name_ar
                              : item.color_name_en}{" "}
                            / {item.size}
                          </span>
                        )}

                        {/* Quantity */}
                        <div className="inline-flex items-center border border-[#E5E5E5] bg-white h-9">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity - 1)
                            }
                            className="w-8 h-full flex items-center justify-center hover:bg-[#F5F5F5] cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-9 text-center text-xs tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={item.quantity >= item.stock_quantity}
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity + 1)
                            }
                            className="w-8 h-full flex items-center justify-center hover:bg-[#F5F5F5] disabled:opacity-40 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <span className="text-sm font-semibold tabular-nums text-black">
                        {formatEGP(item.unit_price * item.quantity, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-4">
            <div className="border border-[#E5E5E5] bg-white p-6 space-y-5 sticky top-24">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-black pb-3 border-b border-[#E5E5E5]">
                {t("title")}
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#777777]">{t("subtotal")}</span>
                  <span className="font-semibold tabular-nums">
                    {formatEGP(subtotal, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#777777]">{t("shipping")}</span>
                  <span className="text-[#777777]">
                    {t("shippingCalculatedAtCheckout")}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5E5E5] flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  {t("total")}
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {formatEGP(subtotal, locale)}
                </span>
              </div>

              <p className="text-[11px] text-[#777777]">{codNoticeText}</p>

              <Link href="/checkout" className="block">
                <Button variant="primary" size="lg" fullWidth>
                  {t("checkout")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
