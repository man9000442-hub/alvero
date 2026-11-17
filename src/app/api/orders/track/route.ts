import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";
import { trackOrderSchema } from "@/lib/validation/checkout";
import { checkAndConsumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rate = await checkAndConsumeRateLimit({
      key: `track:${ip}`,
      maxAttempts: 20,
      windowSeconds: 300,
      blockSeconds: 300,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", retryAfterSeconds: rate.retryAfterSeconds },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = trackOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_TRACKING_INPUT" },
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
    const { data, error } = await supabase.rpc("track_customer_order", {
      p_order_number: parsed.data.orderNumber,
      p_phone: parsed.data.phone,
    });

    if (error || !data) {
      return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ order: data });
  } catch {
    return NextResponse.json({ error: "TRACKING_FAILED" }, { status: 500 });
  }
}
