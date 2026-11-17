import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const customerNotesSchema = z.object({
  notes: z.string().max(2000),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("customers:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = customerNotesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_NOTES" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("customers")
    .update({ notes: parsed.data.notes })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "CUSTOMER_NOTES_UPDATED",
    entityType: "customer",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
