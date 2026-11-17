import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("products:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: source } = await supabase
    .from("products")
    .select("*, images:product_images(*), variants:product_variants(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!source) {
    return NextResponse.json({ error: "PRODUCT_NOT_FOUND" }, { status: 404 });
  }

  const suffix = Math.random().toString(36).slice(2, 6);
  const { data: copy, error } = await supabase
    .from("products")
    .insert({
      category_id: source.category_id,
      slug: `${source.slug}-copy-${suffix}`,
      sku: `${source.sku}-COPY-${suffix.toUpperCase()}`,
      brand: source.brand,
      name_en: `${source.name_en} (Copy)`,
      name_ar: `${source.name_ar} (نسخة)`,
      description_en: source.description_en,
      description_ar: source.description_ar,
      details_en: source.details_en,
      details_ar: source.details_ar,
      regular_price: source.regular_price,
      sale_price: source.sale_price,
      main_image_url: source.main_image_url,
      hover_image_url: source.hover_image_url,
      status: "DRAFT",
      is_featured: false,
      is_new_arrival: false,
      is_best_seller: false,
      low_stock_threshold: source.low_stock_threshold,
    })
    .select("*")
    .single();

  if (error || !copy) {
    return NextResponse.json(
      { error: error?.message ?? "DUPLICATE_FAILED" },
      { status: 400 },
    );
  }

  const images = (source.images ?? []) as Array<{
    url: string;
    alt_en: string | null;
    alt_ar: string | null;
    sort_order: number;
    is_primary: boolean;
  }>;
  if (images.length > 0) {
    await supabase.from("product_images").insert(
      images.map((img) => ({
        product_id: copy.id,
        url: img.url,
        alt_en: img.alt_en,
        alt_ar: img.alt_ar,
        sort_order: img.sort_order,
        is_primary: img.is_primary,
      })),
    );
  }

  const variants = (source.variants ?? []) as Array<{
    size: string;
    color_name_en: string;
    color_name_ar: string;
    color_hex: string;
    sku: string;
    price_override: number | null;
    is_available: boolean;
  }>;
  if (variants.length > 0) {
    await supabase.from("product_variants").insert(
      variants.map((v, idx) => ({
        product_id: copy.id,
        size: v.size,
        color_name_en: v.color_name_en,
        color_name_ar: v.color_name_ar,
        color_hex: v.color_hex,
        sku: `${v.sku}-COPY-${suffix.toUpperCase()}-${idx + 1}`,
        stock_quantity: 0,
        price_override: v.price_override,
        is_available: v.is_available,
      })),
    );
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "PRODUCT_DUPLICATED",
    entityType: "product",
    entityId: copy.id,
    metadata: { source_id: id },
  });

  return NextResponse.json({ product: copy }, { status: 201 });
}
