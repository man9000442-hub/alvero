import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { stockAdjustmentSchema } from "@/lib/validation/admin";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi("inventory:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = stockAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("adjust_variant_stock", {
    p_variant_id: parsed.data.variantId,
    p_new_quantity: parsed.data.newQuantity,
    p_movement_type: parsed.data.movementType,
    p_reason: parsed.data.reason,
    p_actor_id: auth.profile.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data });
}
