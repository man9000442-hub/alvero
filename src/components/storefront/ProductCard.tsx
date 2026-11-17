"use client";

import React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatEGP, resolveProductEffectivePrice } from "@/lib/pricing";
import type { Locale, Product } from "@/types/database";

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations("shop");
  const locale = useLocale() as Locale;

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const { unitPrice, regularPrice, discountPercent } =
    resolveProductEffectivePrice(product);

  const variants = product.variants ?? [];
  const totalStock = variants
    .filter((v) => v.is_available)
    .reduce((acc, v) => acc + v.stock_quantity, 0);
  const isOutOfStock = variants.length > 0 && totalStock <= 0;

  const uniqueColors = Array.from(
    new Map(
      variants.map((v) => [
        v.color_hex,
        {
          hex: v.color_hex,
          name: locale === "ar" ? v.color_name_ar : v.color_name_en,
        },
      ]),
    ).values(),
  ).slice(0, 5);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block bg-transparent"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F2F2F2] border border-[#E5E5E5]">
        {product.main_image_url ? (
          <Image
            src={product.main_image_url}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-all duration-500 ${
              product.hover_image_url
                ? "group-hover:opacity-0"
                : "group-hover:scale-[1.03]"
            } ${isOutOfStock ? "opacity-60 grayscale" : ""}`}
          />
        ) : null}

        {product.hover_image_url && (
          <Image
            src={product.hover_image_url}
            alt={`${name} alternate`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {/* Top Badges */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          {product.is_new_arrival && !isOutOfStock && (
            <Badge variant="solid">{t("newBadge")}</Badge>
          )}
          {discountPercent > 0 && !isOutOfStock && (
            <Badge variant="outline">
              {t("discountBadge", { percent: discountPercent })}
            </Badge>
          )}
          {isOutOfStock && <Badge variant="solid">{t("outOfStock")}</Badge>}
        </div>
      </div>

      <div className="pt-3.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-black group-hover:underline underline-offset-4 line-clamp-1">
            {name}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs tabular-nums">
          <span className="font-semibold text-black">
            {formatEGP(unitPrice, locale)}
          </span>
          {discountPercent > 0 && (
            <span className="text-[#777777] line-through">
              {formatEGP(regularPrice, locale)}
            </span>
          )}
        </div>

        {uniqueColors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            {uniqueColors.map((c) => (
              <span
                key={c.hex}
                title={c.name}
                className="w-3 h-3 rounded-full border border-[#CCCCCC]"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
