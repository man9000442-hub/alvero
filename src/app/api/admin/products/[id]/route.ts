import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { productInputSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("products:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();

    // Quick status/toggle patch support
    if (body.quickPatch) {
      const supabase = createSupabaseAdminClient();
      const allowed: Record<string, unknown> = {};
      if ("status" in body) allowed.status = body.status;
      if ("is_featured" in body) allowed.is_featured = Boolean(body.is_featured);
      if ("is_new_arrival" in body)
        allowed.is_new_arrival = Boolean(body.is_new_arrival);
      if ("is_best_seller" in body)
        allowed.is_best_seller = Boolean(body.is_best_seller);

      const { error } = await supabase
        .from("products")
        .update(allowed)
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await writeAuditLog({
        actor: auth.profile,
        action: "PRODUCT_QUICK_UPDATED",
        entityType: "product",
        entityId: id,
        metadata: allowed,
      });
      revalidatePath("/en/shop");
      revalidatePath("/ar/shop");
      return NextResponse.json({ ok: true });
    }

    const parsed = productInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const d = parsed.data;
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from("products")
      .update({
        category_id: d.category_id || null,
        slug: d.slug,
        sku: d.sku,
        brand: d.brand,
        name_en: d.name_en,
        name_ar: d.name_ar,
        description_en: d.description_en,
        description_ar: d.description_ar,
        details_en: d.details_en,
        details_ar: d.details_ar,
        regular_price: d.regular_price,
        sale_price: d.sale_price ?? null,
        main_image_url: d.main_image_url || d.gallery_urls[0] || null,
        hover_image_url: d.hover_image_url || d.gallery_urls[1] || null,
        status: d.status,
        is_featured: d.is_featured,
        is_new_arrival: d.is_new_arrival,
        is_best_seller: d.is_best_seller,
        low_stock_threshold: d.low_stock_threshold,
        seo_title_en: d.seo_title_en || null,
        seo_title_ar: d.seo_title_ar || null,
        seo_description_en: d.seo_description_en || null,
        seo_description_ar: d.seo_description_ar || null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (d.cost_price !== undefined) {
      await supabase.from("product_private_metrics").upsert({
        product_id: id,
        cost_price: d.cost_price,
      });
    }

    // Sync gallery images
    await supabase.from("product_images").delete().eq("product_id", id);
    if (d.gallery_urls.length > 0) {
      await supabase.from("product_images").insert(
        d.gallery_urls.map((url, idx) => ({
          product_id: id,
          url,
          sort_order: idx,
          is_primary: idx === 0,
        })),
      );
    }

    // Sync variants safely without breaking existing referenced variants when possible
    const { data: existingVariants } = await supabase
      .from("product_variants")
      .select("id, stock_quantity, sku")
      .eq("product_id", id);

    const existingMap = new Map<string, { id: string; stock_quantity: number }>();
    for (const ev of existingVariants ?? []) {
      existingMap.set(ev.id, { id: ev.id, stock_quantity: ev.stock_quantity });
    }

    const keptIds = new Set<string>();
    for (const v of d.variants) {
      if (v.id && existingMap.has(v.id)) {
        keptIds.add(v.id);
        const prev = existingMap.get(v.id)!;
        await supabase
          .from("product_variants")
          .update({
            size: v.size,
            color_name_en: v.color_name_en,
            color_name_ar: v.color_name_ar,
            color_hex: v.color_hex,
            sku: v.sku,
            stock_quantity: v.stock_quantity,
            price_override: v.price_override ?? null,
            is_available: v.is_available,
          })
          .eq("id", v.id);

        if (prev.stock_quantity !== v.stock_quantity) {
          await supabase.from("inventory_movements").insert({
            product_id: id,
            variant_id: v.id,
            sku: v.sku,
            movement_type: "MANUAL_ADJUSTMENT",
            quantity_delta: v.stock_quantity - prev.stock_quantity,
            previous_quantity: prev.stock_quantity,
            new_quantity: v.stock_quantity,
            reason: "Updated via Product Editor",
            created_by: auth.profile.id,
          });
        }
      } else {
        const { data: createdVar } = await supabase
          .from("product_variants")
          .insert({
            product_id: id,
            size: v.size,
            color_name_en: v.color_name_en,
            color_name_ar: v.color_name_ar,
            color_hex: v.color_hex,
            sku: v.sku,
            stock_quantity: v.stock_quantity,
            price_override: v.price_override ?? null,
            is_available: v.is_available,
          })
          .select("id")
          .single();
        if (createdVar) {
          keptIds.add(createdVar.id);
          await supabase.from("inventory_movements").insert({
            product_id: id,
            variant_id: createdVar.id,
            sku: v.sku,
            movement_type: "INITIAL",
            quantity_delta: v.stock_quantity,
            previous_quantity: 0,
            new_quantity: v.stock_quantity,
            reason: "Variant added via Product Editor",
            created_by: auth.profile.id,
          });
        }
      }
    }

    const toRemove = (existingVariants ?? [])
      .map((ev) => ev.id)
      .filter((vid) => !keptIds.has(vid));
    if (toRemove.length > 0) {
      await supabase.from("product_variants").delete().in("id", toRemove);
    }

    await writeAuditLog({
      actor: auth.profile,
      action: "PRODUCT_UPDATED",
      entityType: "product",
      entityId: id,
      metadata: { sku: d.sku, name_en: d.name_en },
    });

    revalidatePath("/en");
    revalidatePath("/ar");
    revalidatePath("/en/shop");
    revalidatePath("/ar/shop");
    revalidatePath(`/en/products/${d.slug}`);
    revalidatePath(`/ar/products/${d.slug}`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "PRODUCT_UPDATE_FAILED" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("products:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), status: "ARCHIVED" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "PRODUCT_SOFT_DELETED",
    entityType: "product",
    entityId: id,
  });

  revalidatePath("/en/shop");
  revalidatePath("/ar/shop");
  return NextResponse.json({ ok: true });
}
