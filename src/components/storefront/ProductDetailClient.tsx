"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, ShieldCheck, Truck, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatEGP, resolveProductEffectivePrice } from "@/lib/pricing";
import { useCart } from "./CartProvider";
import { ProductCard } from "./ProductCard";
import type { Locale, Product, StorefrontCopy } from "@/types/database";

const RECENT_KEY = "alvero_recently_viewed_v1";

interface RecentProductSnapshot {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  regular_price: number;
  sale_price: number | null;
  main_image_url: string | null;
}

export function ProductDetailClient({
  product,
  relatedProducts,
  copy,
}: {
  product: Product;
  relatedProducts: Product[];
  copy?: StorefrontCopy;
}) {
  const t = useTranslations("product");
  const locale = useLocale() as Locale;
  const { addItem } = useCart();
  const { showToast } = useToast();

  const gallery = useMemo(() => {
    const urls = new Set<string>();
    if (product.main_image_url) urls.add(product.main_image_url);
    if (product.hover_image_url) urls.add(product.hover_image_url);
    for (const img of product.images ?? []) {
      if (img.url) urls.add(img.url);
    }
    return Array.from(urls);
  }, [product]);

  const [activeImage, setActiveImage] = useState(gallery[0] ?? "");
  const [zoomOpen, setZoomOpen] = useState(false);

  const variants = useMemo(() => product.variants ?? [], [product.variants]);

  const colors = useMemo(() => {
    return Array.from(
      new Map(
        variants.map((v) => [
          v.color_name_en,
          {
            en: v.color_name_en,
            ar: v.color_name_ar,
            hex: v.color_hex,
          },
        ]),
      ).values(),
    );
  }, [variants]);

  const firstInStock =
    variants.find((v) => v.is_available && v.stock_quantity > 0) ?? variants[0];

  const [selectedColor, setSelectedColor] = useState<string>(
    firstInStock?.color_name_en ?? colors[0]?.en ?? "",
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    firstInStock?.size ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const [recentItems, setRecentItems] = useState<RecentProductSnapshot[]>([]);

  const sizesForColor = useMemo(() => {
    return variants.filter((v) => v.color_name_en === selectedColor);
  }, [variants, selectedColor]);

  const activeVariant = useMemo(() => {
    return (
      variants.find(
        (v) =>
          v.color_name_en === selectedColor && v.size === selectedSize,
      ) ?? null
    );
  }, [variants, selectedColor, selectedSize]);

  // Track recently viewed in localStorage
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(RECENT_KEY);
        const parsed: RecentProductSnapshot[] = raw ? JSON.parse(raw) : [];
        const filtered = parsed.filter((p) => p.id !== product.id);
        setRecentItems(filtered.slice(0, 4));

        const updated: RecentProductSnapshot[] = [
          {
            id: product.id,
            slug: product.slug,
            name_en: product.name_en,
            name_ar: product.name_ar,
            regular_price: Number(product.regular_price),
            sale_price:
              product.sale_price !== null ? Number(product.sale_price) : null,
            main_image_url: product.main_image_url,
          },
          ...filtered,
        ].slice(0, 8);
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }
    });
    return () => {
      active = false;
    };
  }, [product]);

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const description =
    locale === "ar" ? product.description_ar : product.description_en;
  const details = locale === "ar" ? product.details_ar : product.details_en;
  const categoryName = product.category
    ? locale === "ar"
      ? product.category.name_ar
      : product.category.name_en
    : null;

  const { unitPrice, regularPrice, discountPercent } =
    resolveProductEffectivePrice(product, activeVariant);

  const availableStock =
    activeVariant && activeVariant.is_available
      ? activeVariant.stock_quantity
      : 0;
  const canAdd = Boolean(activeVariant && availableStock > 0);

  const handleColorSelect = (colorEn: string) => {
    setSelectedColor(colorEn);
    const matching = variants.filter((v) => v.color_name_en === colorEn);
    const preferred =
      matching.find(
        (v) => v.size === selectedSize && v.is_available && v.stock_quantity > 0,
      ) ??
      matching.find((v) => v.is_available && v.stock_quantity > 0) ??
      matching[0];
    setSelectedSize(preferred?.size ?? "");
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (!activeVariant) {
      showToast(t("selectOptionsPrompt"), "error");
      return;
    }
    if (!activeVariant.is_available || activeVariant.stock_quantity <= 0) {
      showToast(t("outOfStock"), "error");
      return;
    }

    const res = addItem({
      variantId: activeVariant.id,
      productId: product.id,
      slug: product.slug,
      sku: activeVariant.sku,
      name_en: product.name_en,
      name_ar: product.name_ar,
      size: activeVariant.size,
      color_name_en: activeVariant.color_name_en,
      color_name_ar: activeVariant.color_name_ar,
      color_hex: activeVariant.color_hex,
      image_url: product.main_image_url,
      unit_price: unitPrice,
      regular_price: regularPrice,
      quantity,
      stock_quantity: activeVariant.stock_quantity,
    });

    if (!res.ok) {
      showToast(t("insufficientStock"), "error");
    } else {
      showToast(t("addedToBag"), "success");
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div
            onClick={() => activeImage && setZoomOpen(true)}
            className="group relative aspect-[3/4] w-full bg-[#F5F5F5] border border-[#E5E5E5] overflow-hidden cursor-zoom-in"
          >
            {activeImage && (
              <Image
                src={activeImage}
                alt={name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            )}
            <span className="absolute bottom-4 end-4 bg-white/90 border border-[#E5E5E5] p-2 text-black">
              <ZoomIn className="h-4 w-4" />
            </span>
          </div>

          {gallery.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {gallery.map((imgUrl, idx) => (
                <button
                  key={imgUrl + idx}
                  type="button"
                  onClick={() => setActiveImage(imgUrl)}
                  className={`relative aspect-[3/4] bg-[#F5F5F5] border overflow-hidden cursor-pointer ${
                    activeImage === imgUrl
                      ? "border-black ring-1 ring-black"
                      : "border-[#E5E5E5] opacity-75 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt={`${name} ${idx + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info & Purchase Controls */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start space-y-7">
          <div className="space-y-3 pb-6 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-2">
              {categoryName && (
                <span className="text-[11px] uppercase tracking-[0.18em] text-[#777777]">
                  {categoryName}
                </span>
              )}
              {product.is_new_arrival && <Badge variant="solid">NEW</Badge>}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl text-black tracking-[0.04em]">
              {name}
            </h1>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-xl font-semibold tabular-nums text-black">
                {formatEGP(unitPrice, locale)}
              </span>
              {discountPercent > 0 && (
                <>
                  <span className="text-sm text-[#777777] line-through tabular-nums">
                    {formatEGP(regularPrice, locale)}
                  </span>
                  <Badge variant="outline">
                    {t("savePercent", { percent: discountPercent })}
                  </Badge>
                </>
              )}
            </div>

            <p className="text-[11px] uppercase tracking-[0.14em] text-[#777777]">
              {t("sku")}: {activeVariant?.sku ?? product.sku}
            </p>
          </div>

          <p className="text-sm text-[#333333] leading-relaxed whitespace-pre-line">
            {description}
          </p>

          {/* Color Selector */}
          {colors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em]">
                <span className="text-[#777777]">{t("selectColor")}</span>
                <span className="font-medium text-black">
                  {locale === "ar"
                    ? colors.find((c) => c.en === selectedColor)?.ar
                    : selectedColor}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => {
                  const active = c.en === selectedColor;
                  return (
                    <button
                      key={c.en}
                      type="button"
                      onClick={() => handleColorSelect(c.en)}
                      title={locale === "ar" ? c.ar : c.en}
                      className={`w-9 h-9 rounded-full border-2 p-0.5 cursor-pointer transition-all ${
                        active ? "border-black scale-105" : "border-[#E5E5E5]"
                      }`}
                    >
                      <span
                        className="block w-full h-full rounded-full border border-[#CCCCCC]"
                        style={{ backgroundColor: c.hex }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {sizesForColor.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em]">
                <span className="text-[#777777]">{t("selectSize")}</span>
                <span className="font-medium text-black">{selectedSize}</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {sizesForColor.map((v) => {
                  const inStock = v.is_available && v.stock_quantity > 0;
                  const active = v.size === selectedSize;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedSize(v.size);
                        setQuantity(1);
                      }}
                      className={`h-11 border text-xs uppercase tracking-widest transition-colors cursor-pointer ${
                        active
                          ? "bg-black text-white border-black"
                          : inStock
                            ? "bg-white text-black border-[#E5E5E5] hover:border-black"
                            : "bg-[#FAFAFA] text-[#AAAAAA] border-[#E5E5E5] line-through"
                      }`}
                    >
                      {v.size || "ONE"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Status */}
          <div className="text-xs">
            {availableStock <= 0 ? (
              <p className="font-medium uppercase tracking-widest text-black">
                {t("outOfStock")}
              </p>
            ) : availableStock <= product.low_stock_threshold ? (
              <p className="font-medium text-black">
                {t("lowStockCount", { count: availableStock })}
              </p>
            ) : (
              <p className="text-[#777777]">
                {t("inStockCount", { count: availableStock })}
              </p>
            )}
          </div>

          {/* Quantity + Add to Bag */}
          <div className="flex gap-3">
            <div className="inline-flex items-center border border-black h-12 bg-white">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-11 h-full flex items-center justify-center hover:bg-[#F5F5F5] disabled:opacity-40 cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center text-xs font-medium tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                disabled={!canAdd || quantity >= availableStock}
                onClick={() =>
                  setQuantity((q) => Math.min(availableStock, q + 1))
                }
                className="w-11 h-full flex items-center justify-center hover:bg-[#F5F5F5] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canAdd}
              onClick={handleAddToCart}
            >
              {canAdd ? t("addToCart") : t("outOfStock")}
            </Button>
          </div>

          {/* Details & Shipping Accordions */}
          <div className="pt-4 border-t border-[#E5E5E5] space-y-5 text-xs">
            {details && (
              <div className="space-y-1.5">
                <h3 className="font-semibold uppercase tracking-[0.14em] text-black flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 stroke-[1.5]" />
                  {t("detailsTitle")}
                </h3>
                <p className="text-[#555555] leading-relaxed">{details}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="font-semibold uppercase tracking-[0.14em] text-black flex items-center gap-2">
                <Truck className="h-4 w-4 stroke-[1.5]" />
                {(locale === "ar"
                  ? copy?.product_shipping_title_ar
                  : copy?.product_shipping_title_en) || t("shippingTitle")}
              </h3>
              <p className="text-[#555555] leading-relaxed">
                {(locale === "ar"
                  ? copy?.product_shipping_desc_ar
                  : copy?.product_shipping_desc_en) || t("shippingDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 pt-14 border-t border-[#E5E5E5]">
          <h2 className="font-serif text-2xl uppercase tracking-[0.14em] text-black mb-8">
            {t("relatedProducts")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      {recentItems.length > 0 && (
        <section className="mt-16 pt-14 border-t border-[#E5E5E5]">
          <h2 className="font-serif text-xl uppercase tracking-[0.14em] text-black mb-8">
            {t("recentlyViewed")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
            {recentItems.map((ri) => (
              <ProductCard
                key={ri.id}
                product={
                  {
                    ...ri,
                    category_id: null,
                    sku: "",
                    brand: "ALVERO",
                    description_en: "",
                    description_ar: "",
                    details_en: "",
                    details_ar: "",
                    hover_image_url: null,
                    status: "ACTIVE",
                    is_featured: false,
                    is_new_arrival: false,
                    is_best_seller: false,
                    sales_count: 0,
                    popularity_score: 0,
                    low_stock_threshold: 5,
                    seo_title_en: null,
                    seo_title_ar: null,
                    seo_description_en: null,
                    seo_description_ar: null,
                    deleted_at: null,
                    created_at: "",
                    updated_at: "",
                    variants: [],
                  } as Product
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Zoom Lightbox Modal */}
      <Modal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        title={name}
        maxWidth="max-w-3xl"
      >
        {activeImage && (
          <div className="relative aspect-[3/4] w-full bg-[#F5F5F5]">
            <Image
              src={activeImage}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-contain"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
