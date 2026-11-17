import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { orderStatusUpdateSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("orders:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = orderStatusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("transition_order_status", {
      p_order_id: id,
      p_new_status: parsed.data.status,
      p_note: parsed.data.note,
      p_actor_id: auth.profile.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ result: data });
  } catch {
    return NextResponse.json(
      { error: "STATUS_TRANSITION_FAILED" },
      { status: 500 },
    );
  }
}
