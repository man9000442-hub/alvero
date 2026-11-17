import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";
import { resolveProductEffectivePrice } from "@/lib/pricing";

const syncSchema = z.object({
  sessionToken: z.string().min(8).max(120),
  locale: z.enum(["en", "ar"]).default("en"),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .max(50),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_CART_PAYLOAD" },
        { status: 400 },
      );
    }

    if (!isAdminSupabaseConfigured()) {
      return NextResponse.json({ items: [], synced: false });
    }

    const supabase = createSupabaseAdminClient();
    const variantIds = parsed.data.items.map((i) => i.variantId);

    if (variantIds.length === 0) {
      const { data: cart } = await supabase
        .from("carts")
        .select("id")
        .eq("session_token", parsed.data.sessionToken)
        .maybeSingle();

      if (cart) {
        await supabase.from("cart_items").delete().eq("cart_id", cart.id);
      }
      return NextResponse.json({ items: [], synced: true });
    }

    const { data: variants } = await supabase
      .from("product_variants")
      .select(
        "*, product:products!inner(id, slug, name_en, name_ar, regular_price, sale_price, main_image_url, status, deleted_at)",
      )
      .in("id", variantIds);

    const variantMap = new Map<string, Record<string, unknown>>();
    for (const v of variants ?? []) {
      variantMap.set(v.id, v as Record<string, unknown>);
    }

    const verifiedItems = [];
    for (const reqItem of parsed.data.items) {
      const v = variantMap.get(reqItem.variantId) as
        | {
            id: string;
            product_id: string;
            size: string;
            color_name_en: string;
            color_name_ar: string;
            color_hex: string;
            sku: string;
            stock_quantity: number;
            price_override: number | null;
            is_available: boolean;
            product: {
              id: string;
              slug: string;
              name_en: string;
              name_ar: string;
              regular_price: number;
              sale_price: number | null;
              main_image_url: string | null;
              status: string;
              deleted_at: string | null;
            };
          }
        | undefined;

      if (
        !v ||
        v.product.status !== "ACTIVE" ||
        v.product.deleted_at !== null ||
        !v.is_available ||
        v.stock_quantity <= 0
      ) {
        continue;
      }

      const { unitPrice, regularPrice } = resolveProductEffectivePrice(
        v.product,
        v,
      );
      const clampedQty = Math.min(reqItem.quantity, v.stock_quantity);

      verifiedItems.push({
        variantId: v.id,
        productId: v.product.id,
        slug: v.product.slug,
        sku: v.sku,
        name_en: v.product.name_en,
        name_ar: v.product.name_ar,
        size: v.size,
        color_name_en: v.color_name_en,
        color_name_ar: v.color_name_ar,
        color_hex: v.color_hex,
        image_url: v.product.main_image_url,
        unit_price: unitPrice,
        regular_price: regularPrice,
        quantity: clampedQty,
        stock_quantity: v.stock_quantity,
      });
    }

    // Persist cart snapshot into DB for session durability
    const { data: upsertedCart } = await supabase
      .from("carts")
      .upsert(
        {
          session_token: parsed.data.sessionToken,
          locale: parsed.data.locale,
        },
        { onConflict: "session_token" },
      )
      .select("id")
      .single();

    if (upsertedCart) {
      await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", upsertedCart.id);

      if (verifiedItems.length > 0) {
        await supabase.from("cart_items").insert(
          verifiedItems.map((item) => ({
            cart_id: upsertedCart.id,
            product_id: item.productId,
            variant_id: item.variantId,
            quantity: item.quantity,
          })),
        );
      }
    }

    return NextResponse.json({ items: verifiedItems, synced: true });
  } catch {
    return NextResponse.json({ error: "CART_SYNC_FAILED" }, { status: 500 });
  }
}
