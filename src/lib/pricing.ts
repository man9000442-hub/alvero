import type {
  DeliveryArea,
  Discount,
  Governorate,
  Locale,
  Product,
  ProductVariant,
  ShippingRule,
} from "@/types/database";

export function formatEGP(amount: number, locale: Locale = "en"): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    minimumFractionDigits: safe % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safe);

  return locale === "ar" ? `${formatted} ج.م` : `${formatted} EGP`;
}

export function resolveProductEffectivePrice(
  product: Pick<Product, "regular_price" | "sale_price">,
  variant?: Pick<ProductVariant, "price_override"> | null,
): { unitPrice: number; regularPrice: number; discountPercent: number } {
  const regularPrice =
    variant?.price_override !== null && variant?.price_override !== undefined
      ? Number(variant.price_override)
      : Number(product.regular_price);

  let unitPrice = regularPrice;
  if (
    variant?.price_override === null ||
    variant?.price_override === undefined
  ) {
    if (
      product.sale_price !== null &&
      product.sale_price !== undefined &&
      Number(product.sale_price) < regularPrice
    ) {
      unitPrice = Number(product.sale_price);
    }
  }

  const discountPercent =
    regularPrice > 0 && unitPrice < regularPrice
      ? Math.round(((regularPrice - unitPrice) / regularPrice) * 100)
      : 0;

  return { unitPrice, regularPrice, discountPercent };
}

export interface DiscountCalcItem {
  product_id: string;
  category_id: string | null;
  line_total: number;
}

export function evaluateDiscountAmount(
  discount: Discount,
  items: DiscountCalcItem[],
  now: Date = new Date(),
): { eligible: boolean; discountAmount: number; reason?: string } {
  if (!discount.is_active) {
    return { eligible: false, discountAmount: 0, reason: "DISCOUNT_INACTIVE" };
  }
  if (discount.starts_at && new Date(discount.starts_at) > now) {
    return { eligible: false, discountAmount: 0, reason: "DISCOUNT_NOT_STARTED" };
  }
  if (discount.expires_at && new Date(discount.expires_at) <= now) {
    return { eligible: false, discountAmount: 0, reason: "DISCOUNT_EXPIRED" };
  }
  if (
    discount.usage_limit !== null &&
    discount.usage_count >= discount.usage_limit
  ) {
    return { eligible: false, discountAmount: 0, reason: "DISCOUNT_USAGE_LIMIT_REACHED" };
  }

  const subtotal = items.reduce((acc, item) => acc + item.line_total, 0);
  if (subtotal < Number(discount.min_order_amount || 0)) {
    return { eligible: false, discountAmount: 0, reason: "DISCOUNT_MIN_ORDER_NOT_MET" };
  }

  let eligibleSubtotal = 0;
  if (discount.scope === "STORE_WIDE") {
    eligibleSubtotal = subtotal;
  } else if (discount.scope === "PRODUCTS") {
    const allowed = new Set(discount.product_ids ?? []);
    eligibleSubtotal = items
      .filter((item) => allowed.has(item.product_id))
      .reduce((acc, item) => acc + item.line_total, 0);
  } else if (discount.scope === "CATEGORIES") {
    const allowed = new Set(discount.category_ids ?? []);
    eligibleSubtotal = items
      .filter((item) => item.category_id && allowed.has(item.category_id))
      .reduce((acc, item) => acc + item.line_total, 0);
  }

  if (eligibleSubtotal <= 0) {
    return { eligible: false, discountAmount: 0, reason: "DISCOUNT_NOT_APPLICABLE_TO_ITEMS" };
  }

  let amount =
    discount.discount_type === "PERCENTAGE"
      ? Math.round(eligibleSubtotal * (Number(discount.discount_value) / 100) * 100) / 100
      : Math.min(eligibleSubtotal, Number(discount.discount_value));

  if (
    discount.max_discount_amount !== null &&
    discount.max_discount_amount !== undefined
  ) {
    amount = Math.min(amount, Number(discount.max_discount_amount));
  }

  amount = Math.min(amount, subtotal);
  return { eligible: amount > 0, discountAmount: Math.max(0, amount) };
}

export function calculateShippingFee(params: {
  netSubtotal: number;
  governorate?: Pick<Governorate, "shipping_fee" | "free_shipping_threshold"> | null;
  area?: Pick<DeliveryArea, "shipping_fee_override"> | null;
  globalRule?: Pick<
    ShippingRule,
    "default_shipping_fee" | "free_shipping_threshold" | "is_free_shipping_enabled"
  > | null;
}): number {
  const { netSubtotal, governorate, area, globalRule } = params;

  const baseFee =
    area?.shipping_fee_override ??
    governorate?.shipping_fee ??
    globalRule?.default_shipping_fee ??
    70;

  if (globalRule?.is_free_shipping_enabled !== false) {
    const threshold =
      governorate?.free_shipping_threshold ??
      globalRule?.free_shipping_threshold ??
      null;
    if (threshold !== null && netSubtotal >= Number(threshold)) {
      return 0;
    }
  }

  return Math.max(0, Number(baseFee));
}

export function buildWhatsAppOrderUrl(params: {
  whatsappNumber: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  locale: Locale;
}): string {
  const digits = params.whatsappNumber.replace(/[^0-9]/g, "");
  const totalFormatted = formatEGP(params.totalAmount, params.locale);
  const message =
    params.locale === "ar"
      ? `مرحباً ألفيرو، أود تأكيد طلبي:\nرقم الطلب: ${params.orderNumber}\nالاسم: ${params.customerName}\nالإجمالي (الدفع عند الاستلام): ${totalFormatted}`
      : `Hello ALVERO, I would like to confirm my Cash on Delivery order:\nOrder Number: ${params.orderNumber}\nCustomer: ${params.customerName}\nTotal: ${totalFormatted}`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
