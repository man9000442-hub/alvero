import { describe, expect, it } from "vitest";
import {
  isValidEgyptPhone,
  normalizeEgyptPhone,
  toWhatsAppEgyptNumber,
} from "../validation/egypt-phone";
import { checkoutSchema } from "../validation/checkout";
import {
  buildWhatsAppOrderUrl,
  calculateShippingFee,
  evaluateDiscountAmount,
  formatEGP,
  resolveProductEffectivePrice,
} from "../pricing";
import type { Discount } from "@/types/database";

describe("Egyptian Phone Validation & Normalization", () => {
  it("normalizes +20, 0020, and spaces into 11-digit 01XXXXXXXXX format", () => {
    expect(normalizeEgyptPhone("+20 101 234 5678")).toBe("01012345678");
    expect(normalizeEgyptPhone("00201123456789")).toBe("01123456789");
    expect(normalizeEgyptPhone("201234567890")).toBe("01234567890");
    expect(normalizeEgyptPhone("1512345678")).toBe("01512345678");
  });

  it("accepts valid Egyptian carrier prefixes (010, 011, 012, 015)", () => {
    expect(isValidEgyptPhone("01012345678")).toBe(true);
    expect(isValidEgyptPhone("01112345678")).toBe(true);
    expect(isValidEgyptPhone("01212345678")).toBe(true);
    expect(isValidEgyptPhone("01512345678")).toBe(true);
    expect(isValidEgyptPhone("+201098765432")).toBe(true);
  });

  it("rejects invalid prefixes and malformed numbers", () => {
    expect(isValidEgyptPhone("01312345678")).toBe(false);
    expect(isValidEgyptPhone("0101234567")).toBe(false);
    expect(isValidEgyptPhone("0223456789")).toBe(false);
    expect(isValidEgyptPhone("not-a-phone")).toBe(false);
  });

  it("formats WhatsApp Egypt number without leading +", () => {
    expect(toWhatsAppEgyptNumber("01012345678")).toBe("201012345678");
  });
});

describe("Pricing, Discounts, and Shipping Engine", () => {
  it("resolves sale price and variant price override accurately", () => {
    expect(
      resolveProductEffectivePrice({ regular_price: 2000, sale_price: 1500 }),
    ).toEqual({
      unitPrice: 1500,
      regularPrice: 2000,
      discountPercent: 25,
    });

    expect(
      resolveProductEffectivePrice(
        { regular_price: 2000, sale_price: 1500 },
        { price_override: 2200 },
      ),
    ).toEqual({
      unitPrice: 2200,
      regularPrice: 2200,
      discountPercent: 0,
    });
  });

  const baseDiscount: Discount = {
    id: "d1",
    code: "ALVERO20",
    is_automatic: false,
    name_en: "20% Off",
    name_ar: "خصم 20%",
    description_en: "",
    description_ar: "",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    scope: "STORE_WIDE",
    min_order_amount: 1000,
    max_discount_amount: 500,
    starts_at: null,
    expires_at: "2099-01-01T00:00:00Z",
    usage_limit: 100,
    per_customer_limit: 2,
    usage_count: 5,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
  };

  it("applies percentage discount with max cap", () => {
    const res = evaluateDiscountAmount(baseDiscount, [
      { product_id: "p1", category_id: "c1", line_total: 3000 },
    ]);
    expect(res).toEqual({ eligible: true, discountAmount: 500 });
  });

  it("rejects expired or below-minimum discounts", () => {
    const expired = evaluateDiscountAmount(
      { ...baseDiscount, expires_at: "2020-01-01T00:00:00Z" },
      [{ product_id: "p1", category_id: "c1", line_total: 2000 }],
    );
    expect(expired.eligible).toBe(false);
    expect(expired.reason).toBe("DISCOUNT_EXPIRED");

    const minNotMet = evaluateDiscountAmount(baseDiscount, [
      { product_id: "p1", category_id: "c1", line_total: 500 },
    ]);
    expect(minNotMet.eligible).toBe(false);
    expect(minNotMet.reason).toBe("DISCOUNT_MIN_ORDER_NOT_MET");
  });

  it("scopes discounts to specific products or categories", () => {
    const prodDisc: Discount = {
      ...baseDiscount,
      scope: "PRODUCTS",
      max_discount_amount: null,
      product_ids: ["p1"],
    };
    const res = evaluateDiscountAmount(prodDisc, [
      { product_id: "p1", category_id: "c1", line_total: 1000 },
      { product_id: "p2", category_id: "c2", line_total: 1000 },
    ]);
    expect(res).toEqual({ eligible: true, discountAmount: 200 });
  });

  it("calculates shipping with area override and free-shipping threshold", () => {
    expect(
      calculateShippingFee({
        netSubtotal: 1200,
        governorate: { shipping_fee: 60, free_shipping_threshold: 2500 },
        area: { shipping_fee_override: 55 },
        globalRule: {
          default_shipping_fee: 75,
          free_shipping_threshold: 2500,
          is_free_shipping_enabled: true,
        },
      }),
    ).toBe(55);

    expect(
      calculateShippingFee({
        netSubtotal: 2600,
        governorate: { shipping_fee: 60, free_shipping_threshold: 2500 },
        area: null,
        globalRule: {
          default_shipping_fee: 75,
          free_shipping_threshold: 2500,
          is_free_shipping_enabled: true,
        },
      }),
    ).toBe(0);
  });

  it("formats EGP currency and builds WhatsApp confirmation links", () => {
    expect(formatEGP(1450, "en")).toContain("1,450");
    expect(formatEGP(1450, "en")).toContain("EGP");
    expect(formatEGP(1450, "ar")).toContain("ج.م");

    const url = buildWhatsAppOrderUrl({
      whatsappNumber: "+201000000000",
      orderNumber: "ALV-2026-01001",
      customerName: "Karim",
      totalAmount: 1500,
      locale: "en",
    });
    expect(url).toContain("https://wa.me/201000000000?text=");
    expect(url).toContain("ALV-2026-01001");
  });
});

describe("Checkout Validation Schema", () => {
  const validPayload = {
    idempotencyKey: "alv-1234567890",
    customerName: "Omar Hassan",
    customerPhone: "01012345678",
    secondaryPhone: "",
    customerEmail: "omar@example.com",
    governorateId: "550e8400-e29b-41d4-a716-446655440000",
    deliveryAreaId: "",
    city: "Cairo",
    district: "Zamalek",
    fullAddress: "15 Brazil Street, Zamalek",
    buildingNumber: "15",
    floor: "3",
    apartmentNumber: "6",
    deliveryNotes: "Call upon arrival",
    discountCode: "ALVERO20",
    locale: "en" as const,
    items: [
      {
        variantId: "550e8400-e29b-41d4-a716-446655440001",
        quantity: 2,
      },
    ],
  };

  it("accepts a valid COD checkout submission", () => {
    const res = checkoutSchema.safeParse(validPayload);
    expect(res.success).toBe(true);
  });

  it("rejects empty cart and invalid Egyptian phone", () => {
    const bad = checkoutSchema.safeParse({
      ...validPayload,
      customerPhone: "12345",
      items: [],
    });
    expect(bad.success).toBe(false);
  });
});
