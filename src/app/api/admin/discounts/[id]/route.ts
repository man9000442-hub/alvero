import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { discountInputSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("discounts:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  if (body.toggleOnly) {
    const { error } = await supabase
      .from("discounts")
      .update({ is_active: Boolean(body.is_active) })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = discountInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const { error } = await supabase
    .from("discounts")
    .update({
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
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("discount_products").delete().eq("discount_id", id);
  await supabase.from("discount_categories").delete().eq("discount_id", id);

  if (d.scope === "PRODUCTS" && d.product_ids.length > 0) {
    await supabase
      .from("discount_products")
      .insert(d.product_ids.map((pid) => ({ discount_id: id, product_id: pid })));
  }
  if (d.scope === "CATEGORIES" && d.category_ids.length > 0) {
    await supabase
      .from("discount_categories")
      .insert(d.category_ids.map((cid) => ({ discount_id: id, category_id: cid })));
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "DISCOUNT_UPDATED",
    entityType: "discount",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("discounts:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("discounts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "DISCOUNT_DELETED",
    entityType: "discount",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
