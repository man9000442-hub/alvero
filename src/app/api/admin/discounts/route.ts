import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { discountInputSchema } from "@/lib/validation/admin";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi("discounts:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = discountInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const d = parsed.data;
    const supabase = createSupabaseAdminClient();
    const { data: discount, error } = await supabase
      .from("discounts")
      .insert({
        code: d.is_automatic ? null : d.code || null,
        is_automatic: d.is_automatic,
        name_en: d.name_en,
        name_ar: d.name_ar,
        description_en: d.description_en,
        description_ar: d.description_ar,
        discount_type: d.discount_type,
        discount_value: d.discount_value,
        scope: d.scope,
        min_order_amount: d.min_order_amount,
        max_discount_amount: d.max_discount_amount ?? null,
        starts_at: d.starts_at || null,
        expires_at: d.expires_at || null,
        usage_limit: d.usage_limit ?? null,
        per_customer_limit: d.per_customer_limit ?? null,
        is_active: d.is_active,
      })
      .select("*")
      .single();

    if (error || !discount) {
      return NextResponse.json(
        { error: error?.message ?? "DISCOUNT_CREATE_FAILED" },
        { status: 400 },
      );
    }

    if (d.scope === "PRODUCTS" && d.product_ids.length > 0) {
      await supabase.from("discount_products").insert(
        d.product_ids.map((pid) => ({
          discount_id: discount.id,
          product_id: pid,
        })),
      );
    }

    if (d.scope === "CATEGORIES" && d.category_ids.length > 0) {
      await supabase.from("discount_categories").insert(
        d.category_ids.map((cid) => ({
          discount_id: discount.id,
          category_id: cid,
        })),
      );
    }

    await writeAuditLog({
      actor: auth.profile,
      action: "DISCOUNT_CREATED",
      entityType: "discount",
      entityId: discount.id,
      metadata: { code: discount.code },
    });

    return NextResponse.json({ discount }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "DISCOUNT_CREATE_FAILED" },
      { status: 500 },
    );
  }
}
