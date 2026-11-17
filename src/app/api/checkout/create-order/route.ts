import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";
import { checkoutSchema } from "@/lib/validation/checkout";
import { checkAndConsumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rate = await checkAndConsumeRateLimit({
      key: `checkout:${ip}`,
      maxAttempts: 12,
      windowSeconds: 300,
      blockSeconds: 300,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (!isAdminSupabaseConfigured()) {
      return NextResponse.json(
        { error: "DATABASE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const d = parsed.data;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.rpc("create_cod_order", {
      p_idempotency_key: d.idempotencyKey,
      p_customer_name: d.customerName,
      p_customer_phone: d.customerPhone,
      p_secondary_phone: d.secondaryPhone || null,
      p_customer_email: d.customerEmail || null,
      p_governorate_id: d.governorateId,
      p_delivery_area_id: d.deliveryAreaId || null,
      p_city: d.city,
      p_district: d.district,
      p_full_address: d.fullAddress,
      p_building_number: d.buildingNumber,
      p_apartment_number: d.apartmentNumber || null,
      p_floor: d.floor || null,
      p_delivery_notes: d.deliveryNotes || null,
      p_discount_code: d.discountCode || null,
      p_locale: d.locale,
      p_items: d.items.map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
      })),
    });

    if (error) {
      const msg = error.message || "ORDER_CREATION_FAILED";
      const status =
        msg.includes("INSUFFICIENT_STOCK") ||
        msg.includes("STORE_CLOSED") ||
        msg.includes("DISCOUNT_") ||
        msg.includes("INVALID_")
          ? 400
          : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    return NextResponse.json({ order: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "ORDER_CREATION_FAILED" },
      { status: 500 },
    );
  }
}
