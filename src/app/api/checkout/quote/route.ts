import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";
import {
  calculateShippingFee,
  evaluateDiscountAmount,
  resolveProductEffectivePrice,
} from "@/lib/pricing";
import { normalizeEgyptPhone } from "@/lib/validation/egypt-phone";
import type { DeliveryArea, Discount, Governorate, ShippingRule } from "@/types/database";

const quoteSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1),
  governorateId: z.string().uuid().optional().nullable(),
  deliveryAreaId: z.string().uuid().optional().nullable(),
  discountCode: z.string().trim().max(50).optional().nullable(),
  customerPhone: z.string().trim().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_QUOTE_REQUEST" },
        { status: 400 },
      );
    }

    if (!isAdminSupabaseConfigured()) {
      return NextResponse.json(
        { error: "DATABASE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const variantIds = parsed.data.items.map((i) => i.variantId);

    const { data: variants } = await supabase
      .from("product_variants")
      .select(
        "*, product:products!inner(id, category_id, regular_price, sale_price, status, deleted_at)",
      )
      .in("id", variantIds);

    const variantMap = new Map<string, (typeof variants extends Array<infer T> | null ? T : never)>();
    for (const v of variants ?? []) {
      variantMap.set(v.id, v);
    }

    let subtotal = 0;
    const calcItems: { product_id: string; category_id: string | null; line_total: number }[] = [];
    const stockIssues: string[] = [];

    for (const item of parsed.data.items) {
      const v = variantMap.get(item.variantId);
      if (
        !v ||
        v.product.status !== "ACTIVE" ||
        v.product.deleted_at !== null ||
        !v.is_available ||
        v.stock_quantity < item.quantity
      ) {
        stockIssues.push(v?.sku ?? item.variantId);
        continue;
      }

      const { unitPrice } = resolveProductEffectivePrice(v.product, v);
      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      subtotal += lineTotal;
      calcItems.push({
        product_id: v.product.id,
        category_id: v.product.category_id,
        line_total: lineTotal,
      });
    }

    if (stockIssues.length > 0) {
      return NextResponse.json(
        { error: "INSUFFICIENT_STOCK", skus: stockIssues },
        { status: 409 },
      );
    }

    // Evaluate discount
    let appliedDiscount: { code: string | null; name_en: string; name_ar: string; amount: number } | null = null;
    let discountError: string | null = null;

    if (parsed.data.discountCode?.trim()) {
      const codeUpper = parsed.data.discountCode.trim().toUpperCase();
      const { data: discRow } = await supabase
        .from("discounts")
        .select("*, discount_products(product_id), discount_categories(category_id)")
        .ilike("code", codeUpper)
        .maybeSingle();

      if (!discRow) {
        discountError = "INVALID_DISCOUNT_CODE";
      } else {
        const discount: Discount = {
          ...discRow,
          product_ids:
            (discRow.discount_products as { product_id: string }[] | undefined)?.map(
              (x) => x.product_id,
            ) ?? [],
          category_ids:
            (discRow.discount_categories as { category_id: string }[] | undefined)?.map(
              (x) => x.category_id,
            ) ?? [],
        };

        // Check per-customer usage if phone supplied
        if (discount.per_customer_limit && parsed.data.customerPhone) {
          const normPhone = normalizeEgyptPhone(parsed.data.customerPhone);
          const { count } = await supabase
            .from("discount_usages")
            .select("id", { count: "exact", head: true })
            .eq("discount_id", discount.id)
            .eq("customer_phone", normPhone);
          if ((count ?? 0) >= discount.per_customer_limit) {
            discountError = "DISCOUNT_CUSTOMER_LIMIT_REACHED";
          }
        }

        if (!discountError) {
          const res = evaluateDiscountAmount(discount, calcItems);
          if (!res.eligible) {
            discountError = res.reason ?? "DISCOUNT_NOT_APPLICABLE";
          } else {
            appliedDiscount = {
              code: discount.code,
              name_en: discount.name_en,
              name_ar: discount.name_ar,
              amount: res.discountAmount,
            };
          }
        }
      }
    } else {
      // Check automatic promotions
      const { data: autoRows } = await supabase
        .from("discounts")
        .select("*, discount_products(product_id), discount_categories(category_id)")
        .eq("is_automatic", true)
        .eq("is_active", true);

      let bestAmount = 0;
      for (const row of autoRows ?? []) {
        const discount: Discount = {
          ...row,
          product_ids:
            (row.discount_products as { product_id: string }[] | undefined)?.map(
              (x) => x.product_id,
            ) ?? [],
          category_ids:
            (row.discount_categories as { category_id: string }[] | undefined)?.map(
              (x) => x.category_id,
            ) ?? [],
        };
        const res = evaluateDiscountAmount(discount, calcItems);
        if (res.eligible && res.discountAmount > bestAmount) {
          bestAmount = res.discountAmount;
          appliedDiscount = {
            code: null,
            name_en: discount.name_en,
            name_ar: discount.name_ar,
            amount: res.discountAmount,
          };
        }
      }
    }

    const discountAmount = appliedDiscount?.amount ?? 0;

    // Calculate shipping fee
    const [govRes, areaRes, ruleRes] = await Promise.all([
      parsed.data.governorateId
        ? supabase
            .from("governorates")
            .select("*")
            .eq("id", parsed.data.governorateId)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      parsed.data.deliveryAreaId
        ? supabase
            .from("delivery_areas")
            .select("*")
            .eq("id", parsed.data.deliveryAreaId)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("shipping_rules").select("*").eq("id", 1).maybeSingle(),
    ]);

    const governorate = govRes.data as Governorate | null;
    const area = areaRes.data as DeliveryArea | null;
    const globalRule = ruleRes.data as ShippingRule | null;

    const shippingFee = governorate
      ? calculateShippingFee({
          netSubtotal: Math.max(0, subtotal - discountAmount),
          governorate,
          area,
          globalRule,
        })
      : 0;

    const totalAmount = Math.max(
      0,
      Math.round((subtotal - discountAmount + shippingFee) * 100) / 100,
    );

    return NextResponse.json({
      subtotal,
      discountAmount,
      appliedDiscount,
      discountError,
      shippingFee,
      totalAmount,
      estimatedDaysMin:
        area?.estimated_days_min ?? governorate?.estimated_days_min ?? 2,
      estimatedDaysMax:
        area?.estimated_days_max ?? governorate?.estimated_days_max ?? 4,
    });
  } catch {
    return NextResponse.json({ error: "QUOTE_FAILED" }, { status: 500 });
  }
}
