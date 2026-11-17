import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { productInputSchema } from "@/lib/validation/admin";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi("products:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = productInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const d = parsed.data;
    const supabase = createSupabaseAdminClient();

    const { data: product, error } = await supabase
      .from("products")
      .insert({
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
      .select("*")
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: error?.message ?? "PRODUCT_CREATE_FAILED" },
        { status: 400 },
      );
    }

    if (d.cost_price !== undefined && d.cost_price !== null) {
      await supabase.from("product_private_metrics").upsert({
        product_id: product.id,
        cost_price: d.cost_price,
      });
    }

    if (d.gallery_urls.length > 0) {
      await supabase.from("product_images").insert(
        d.gallery_urls.map((url, idx) => ({
          product_id: product.id,
          url,
          sort_order: idx,
          is_primary: idx === 0,
        })),
      );
    }

    const { data: insertedVariants, error: varErr } = await supabase
      .from("product_variants")
      .insert(
        d.variants.map((v) => ({
          product_id: product.id,
          size: v.size,
          color_name_en: v.color_name_en,
          color_name_ar: v.color_name_ar,
          color_hex: v.color_hex,
          sku: v.sku,
          stock_quantity: v.stock_quantity,
          price_override: v.price_override ?? null,
          is_available: v.is_available,
        })),
      )
      .select("*");

    if (varErr) {
      await supabase.from("products").delete().eq("id", product.id);
      return NextResponse.json({ error: varErr.message }, { status: 400 });
    }

    if (insertedVariants && insertedVariants.length > 0) {
      await supabase.from("inventory_movements").insert(
        insertedVariants.map((v) => ({
          product_id: product.id,
          variant_id: v.id,
          sku: v.sku,
          movement_type: "INITIAL",
          quantity_delta: v.stock_quantity,
          previous_quantity: 0,
          new_quantity: v.stock_quantity,
          reason: "Initial product creation",
          created_by: auth.profile.id,
        })),
      );
    }

    await writeAuditLog({
      actor: auth.profile,
      action: "PRODUCT_CREATED",
      entityType: "product",
      entityId: product.id,
      metadata: { sku: product.sku, name_en: product.name_en },
    });

    revalidatePath("/en");
    revalidatePath("/ar");
    revalidatePath("/en/shop");
    revalidatePath("/ar/shop");

    return NextResponse.json({ product }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "PRODUCT_CREATE_FAILED" },
      { status: 500 },
    );
  }
}
