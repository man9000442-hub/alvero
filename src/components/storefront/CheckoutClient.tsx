"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Banknote, CheckCircle2, Lock, Tag } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { formatEGP } from "@/lib/pricing";
import { isValidEgyptPhone } from "@/lib/validation/egypt-phone";
import { useCart } from "./CartProvider";
import type {
  DeliveryArea,
  Governorate,
  Locale,
  ShippingRule,
  StorefrontCopy,
} from "@/types/database";

interface QuoteState {
  subtotal: number;
  discountAmount: number;
  appliedDiscount: { code: string | null; name_en: string; name_ar: string } | null;
  discountError: string | null;
  shippingFee: number;
  totalAmount: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

export function CheckoutClient({
  governorates,
  areas,
  globalRule,
  storeStatus,
  copy,
}: {
  governorates: Governorate[];
  areas: DeliveryArea[];
  globalRule: ShippingRule;
  storeStatus: "OPEN" | "PAUSED";
  copy?: StorefrontCopy;
}) {
  const t = useTranslations("checkout");
  const tv = useTranslations("validation");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();
  const { items, subtotal: clientSubtotal, isHydrated, clearCart } = useCart();

  const [idempotencyKey] = useState(
    () => `alv-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
  );
  const [promoInput, setPromoInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const formSchema = useMemo(
    () =>
      z.object({
        customerName: z.string().trim().min(2, tv("minLength", { min: 2 })),
        customerPhone: z
          .string()
          .trim()
          .refine(isValidEgyptPhone, tv("invalidEgyptPhone")),
        secondaryPhone: z
          .string()
          .trim()
          .optional()
          .or(z.literal(""))
          .refine((v) => !v || isValidEgyptPhone(v), tv("invalidEgyptPhone")),
        customerEmail: z
          .string()
          .trim()
          .email(tv("invalidEmail"))
          .optional()
          .or(z.literal("")),
        governorateId: z.string().min(1, tv("required")),
        deliveryAreaId: z.string().optional(),
        city: z.string().trim().min(2, tv("required")),
        district: z.string().trim().min(2, tv("required")),
        fullAddress: z.string().trim().min(5, tv("minLength", { min: 5 })),
        buildingNumber: z.string().trim().min(1, tv("required")),
        floor: z.string().optional(),
        apartmentNumber: z.string().optional(),
        deliveryNotes: z.string().optional(),
      }),
    [tv],
  );

  type FormValues = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      governorateId: governorates[0]?.id ?? "",
      deliveryAreaId: "",
      city: "",
      district: "",
    },
  });

  const selectedGovId = useWatch({ control, name: "governorateId" });
  const selectedAreaId = useWatch({ control, name: "deliveryAreaId" });
  const customerPhone = useWatch({ control, name: "customerPhone" });

  const areasForGov = useMemo(
    () => areas.filter((a) => a.governorate_id === selectedGovId),
    [areas, selectedGovId],
  );

  const fetchQuote = useCallback(
    async (codeOverride?: string) => {
      if (items.length === 0) return;
      setQuoting(true);
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
            })),
            governorateId: selectedGovId || null,
            deliveryAreaId: selectedAreaId || null,
            discountCode: codeOverride !== undefined ? codeOverride : appliedCode,
            customerPhone: customerPhone || null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setQuote(data);
          if (codeOverride && data.discountError) {
            showToast(data.discountError, "error");
          } else if (codeOverride && data.appliedDiscount) {
            setAppliedCode(codeOverride);
            showToast(t("promoApplied", { code: codeOverride }), "success");
          }
        }
      } finally {
        setQuoting(false);
      }
    },
    [items, selectedGovId, selectedAreaId, appliedCode, customerPhone, showToast, t],
  );

  useEffect(() => {
    if (items.length === 0) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchQuote();
      }
    });
    return () => {
      active = false;
    };
  }, [items.length, selectedGovId, selectedAreaId, fetchQuote]);

  const handleApplyPromo = () => {
    const clean = promoInput.trim().toUpperCase();
    if (!clean) return;
    void fetchQuote(clean);
  };

  const handleRemovePromo = () => {
    setPromoInput("");
    setAppliedCode("");
    void fetchQuote("");
  };

  const onSubmit = async (values: FormValues) => {
    if (items.length === 0) {
      showToast(t("emptyCartError"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          ...values,
          discountCode: appliedCode || undefined,
          locale,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Unable to place order", "error");
        return;
      }

      clearCart();
      router.push(
        `/order-confirmation/${encodeURIComponent(data.order.order_number)}?token=${encodeURIComponent(data.order.tracking_token)}`,
      );
    } catch {
      showToast("Network error while confirming order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16">
        <div className="h-72 bg-[#F3F3F3] animate-pulse" />
      </div>
    );
  }

  if (storeStatus === "PAUSED") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <EmptyState title={t("title")} description={t("storePaused")} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20">
        <EmptyState
          title={t("emptyCartError")}
          action={
            <Link href="/shop">
              <Button variant="primary">{t("title")}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const displaySubtotal = quote?.subtotal ?? clientSubtotal;
  const displayDiscount = quote?.discountAmount ?? 0;
  const displayShipping =
    quote?.shippingFee ?? globalRule.default_shipping_fee;
  const displayTotal =
    quote?.totalAmount ?? Math.max(0, displaySubtotal - displayDiscount + displayShipping);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
      <div className="pb-6 border-b border-[#E5E5E5] mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl uppercase tracking-[0.12em] text-black">
          {t("title")}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#777777]">
          {(locale === "ar"
            ? copy?.checkout_subtitle_ar
            : copy?.checkout_subtitle_en) || t("subtitle")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-12 gap-10"
      >
        <div className="lg:col-span-7 space-y-10">
          {/* Contact Information */}
          <section className="bg-white border border-[#E5E5E5] p-6 sm:p-8 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-black pb-3 border-b border-[#E5E5E5]">
              {t("contactInfo")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label={t("fullName")}
                  required
                  error={errors.customerName?.message}
                  {...register("customerName")}
                />
              </div>
              <Input
                label={t("phone")}
                required
                dir="ltr"
                placeholder="01012345678"
                error={errors.customerPhone?.message}
                {...register("customerPhone")}
              />
              <Input
                label={t("secondaryPhone")}
                dir="ltr"
                placeholder="01XXXXXXXXX"
                error={errors.secondaryPhone?.message}
                {...register("secondaryPhone")}
              />
              <div className="sm:col-span-2">
                <Input
                  label={t("email")}
                  type="email"
                  dir="ltr"
                  error={errors.customerEmail?.message}
                  {...register("customerEmail")}
                />
              </div>
            </div>
          </section>

          {/* Delivery Address */}
          <section className="bg-white border border-[#E5E5E5] p-6 sm:p-8 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-black pb-3 border-b border-[#E5E5E5]">
              {t("shippingAddress")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label={t("governorate")}
                required
                error={errors.governorateId?.message}
                {...register("governorateId", {
                  onChange: () => setValue("deliveryAreaId", ""),
                })}
              >
                <option value="">{t("selectGovernorate")}</option>
                {governorates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {locale === "ar" ? g.name_ar : g.name_en} (
                    {formatEGP(g.shipping_fee, locale)})
                  </option>
                ))}
              </Select>

              <Select
                label={t("deliveryArea")}
                {...register("deliveryAreaId", {
                  onChange: (e) => {
                    const areaObj = areasForGov.find(
                      (a) => a.id === e.target.value,
                    );
                    if (areaObj) {
                      setValue(
                        "district",
                        locale === "ar" ? areaObj.name_ar : areaObj.name_en,
                      );
                    }
                  },
                })}
              >
                <option value="">{t("selectArea")}</option>
                {areasForGov.map((a) => (
                  <option key={a.id} value={a.id}>
                    {locale === "ar" ? a.name_ar : a.name_en}
                  </option>
                ))}
              </Select>

              <Input
                label={t("city")}
                required
                error={errors.city?.message}
                {...register("city")}
              />
              <Input
                label={t("district")}
                required
                error={errors.district?.message}
                {...register("district")}
              />
              <div className="sm:col-span-2">
                <Input
                  label={t("fullAddress")}
                  required
                  error={errors.fullAddress?.message}
                  {...register("fullAddress")}
                />
              </div>
              <Input
                label={t("buildingNumber")}
                required
                error={errors.buildingNumber?.message}
                {...register("buildingNumber")}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t("floor")} {...register("floor")} />
                <Input
                  label={t("apartmentNumber")}
                  {...register("apartmentNumber")}
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label={t("deliveryNotes")}
                  {...register("deliveryNotes")}
                />
              </div>
            </div>
          </section>

          {/* Payment Method: Strictly COD */}
          <section className="bg-white border border-black p-6 sm:p-8 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-black pb-3 border-b border-[#E5E5E5] flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              {t("paymentMethodTitle")}
            </h2>
            <div className="flex items-start gap-3 pt-1">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-black" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-black">
                  {(locale === "ar"
                    ? copy?.checkout_cod_title_ar
                    : copy?.checkout_cod_title_en) || t("codOnlyTitle")}
                </p>
                <p className="mt-1 text-xs text-[#666666] leading-relaxed">
                  {(locale === "ar"
                    ? copy?.checkout_cod_desc_ar
                    : copy?.checkout_cod_desc_en) || t("codOnlyDesc")}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-[#E5E5E5] p-6 sm:p-8 space-y-6 sticky top-24">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-black pb-3 border-b border-[#E5E5E5]">
              {t("orderSummary")}
            </h2>

            <div className="divide-y divide-[#F0F0F0] max-h-72 overflow-y-auto">
              {items.map((item) => (
                <div key={item.variantId} className="py-3 flex items-center gap-3">
                  <div className="relative w-14 h-18 bg-[#F5F5F5] border border-[#E5E5E5] shrink-0">
                    {item.image_url && (
                      <Image
                        src={item.image_url}
                        alt={locale === "ar" ? item.name_ar : item.name_en}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider truncate">
                      {locale === "ar" ? item.name_ar : item.name_en}
                    </p>
                    <p className="text-[11px] text-[#777777]">
                      {locale === "ar"
                        ? item.color_name_ar
                        : item.color_name_en}{" "}
                      / {item.size} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-medium tabular-nums">
                    {formatEGP(item.unit_price * item.quantity, locale)}
                  </span>
                </div>
              ))}
            </div>

            {/* Promo Code */}
            <div className="pt-2 border-t border-[#E5E5E5] space-y-2">
              <label className="text-[11px] uppercase tracking-[0.12em] text-[#777777] flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                {t("promoCode")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={t("promoPlaceholder")}
                  className="flex-1 h-10 px-3 border border-[#E5E5E5] focus:border-black focus:outline-none text-xs uppercase bg-white"
                />
                {appliedCode ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRemovePromo}
                  >
                    {t("removePromo")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={quoting}
                    onClick={handleApplyPromo}
                  >
                    {t("applyPromo")}
                  </Button>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="pt-4 border-t border-[#E5E5E5] space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#777777]">{t("subtotal")}</span>
                <span className="tabular-nums font-medium">
                  {formatEGP(displaySubtotal, locale)}
                </span>
              </div>

              {displayDiscount > 0 && (
                <div className="flex justify-between text-black font-medium">
                  <span>
                    {t("discount")}
                    {quote?.appliedDiscount?.code
                      ? ` (${quote.appliedDiscount.code})`
                      : ""}
                  </span>
                  <span className="tabular-nums">
                    -{formatEGP(displayDiscount, locale)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-[#777777]">{t("shippingFee")}</span>
                <span className="tabular-nums font-medium">
                  {displayShipping === 0
                    ? t("freeShipping")
                    : formatEGP(displayShipping, locale)}
                </span>
              </div>

              {quote && (
                <p className="text-[11px] text-[#777777]">
                  {t("estimatedDelivery", {
                    min: quote.estimatedDaysMin,
                    max: quote.estimatedDaysMax,
                  })}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-black flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                {t("total")}
              </span>
              <span className="text-lg font-semibold tabular-nums text-black">
                {formatEGP(displayTotal, locale)}
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
            >
              <Lock className="h-3.5 w-3.5" />
              {submitting ? t("placingOrder") : t("placeOrder")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
