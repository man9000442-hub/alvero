import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { categoryInputSchema } from "@/lib/validation/admin";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi("categories:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
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
    const { data: category, error } = await supabase
      .from("categories")
      .insert({
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
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await writeAuditLog({
      actor: auth.profile,
      action: "CATEGORY_CREATED",
      entityType: "category",
      entityId: category.id,
    });

    revalidatePath("/en");
    revalidatePath("/ar");
    revalidatePath("/en/shop");
    revalidatePath("/ar/shop");

    return NextResponse.json({ category }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "CATEGORY_CREATE_FAILED" }, { status: 500 });
  }
}
