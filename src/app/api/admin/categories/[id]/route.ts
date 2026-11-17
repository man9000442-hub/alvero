import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { categoryInputSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("categories:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const d = parsed.data;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("categories")
      .update({
        parent_id: d.parent_id || null,
        slug: d.slug,
        name_en: d.name_en,
        name_ar: d.name_ar,
        description_en: d.description_en,
        description_ar: d.description_ar,
        image_url: d.image_url || null,
        sort_order: d.sort_order,
        is_active: d.is_active,
        is_featured: d.is_featured,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeAuditLog({
      actor: auth.profile,
      action: "CATEGORY_UPDATED",
      entityType: "category",
      entityId: id,
    });

    revalidatePath("/en");
    revalidatePath("/ar");
    revalidatePath("/en/shop");
    revalidatePath("/ar/shop");

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "CATEGORY_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi("categories:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "CATEGORY_DELETED",
    entityType: "category",
    entityId: id,
  });

  revalidatePath("/en");
  revalidatePath("/ar");
  return NextResponse.json({ ok: true });
}
