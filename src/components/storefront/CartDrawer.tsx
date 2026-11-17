"use client";

import React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Drawer } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatEGP } from "@/lib/pricing";
import { useCart } from "./CartProvider";
import type { Locale, StorefrontCopy } from "@/types/database";

export function CartDrawer({ copy }: { copy?: StorefrontCopy }) {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const {
    items,
    subtotal,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
  } = useCart();

  const codNoticeText =
    (locale === "ar" ? copy?.cart_cod_notice_ar : copy?.cart_cod_notice_en) ||
    t("codNotice");

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      title={`${t("title")} (${items.reduce((a, b) => a + b.quantity, 0)})`}
      side="end"
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center py-16">
          <ShoppingBag className="h-10 w-10 stroke-[1.2] text-[#777777] mb-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black">
            {t("emptyTitle")}
          </p>
          <p className="mt-2 text-xs text-[#777777] max-w-xs">
            {t("emptyDesc")}
          </p>
          <Link href="/shop" onClick={closeDrawer} className="mt-6">
            <Button variant="primary" size="sm">
              {t("continueShopping")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="flex-1 divide-y divide-[#E5E5E5] px-6 overflow-y-auto">
            {items.map((item) => {
              const name = locale === "ar" ? item.name_ar : item.name_en;
              const colorName =
                locale === "ar" ? item.color_name_ar : item.color_name_en;

              return (
                <div key={item.variantId} className="py-5 flex gap-4">
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={closeDrawer}
                    className="relative w-20 h-26 bg-[#F5F5F5] shrink-0 overflow-hidden border border-[#E5E5E5]"
                  >
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : null}
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={closeDrawer}
                          className="text-xs font-medium uppercase tracking-wider text-black hover:underline truncate"
                        >
                          {name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          aria-label={t("remove")}
                          className="text-[#777777] hover:text-black cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-[#777777]">
                        {t("color")}: {colorName} · {t("size")}: {item.size}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#E5E5E5]">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity - 1)
                          }
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#F5F5F5] cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.stock_quantity}
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity + 1)
                          }
                          className="w-7 h-7 flex items-center justify-center hover:bg-[#F5F5F5] disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-xs font-medium tabular-nums text-black">
                        {formatEGP(item.unit_price * item.quantity, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[#E5E5E5] p-6 bg-[#FAFAFA] space-y-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em]">
              <span className="text-[#777777]">{t("subtotal")}</span>
              <span className="font-semibold text-black tabular-nums">
                {formatEGP(subtotal, locale)}
              </span>
            </div>
            <p className="text-[11px] text-[#777777]">{codNoticeText}</p>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/cart" onClick={closeDrawer}>
                <Button variant="secondary" size="md" fullWidth>
                  {t("viewBag")}
                </Button>
              </Link>
              <Link href="/checkout" onClick={closeDrawer}>
                <Button variant="primary" size="md" fullWidth>
                  {t("checkout")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
