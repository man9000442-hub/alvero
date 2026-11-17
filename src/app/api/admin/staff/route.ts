import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const createStaffSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  full_name: z.string().trim().min(2),
  role: z.enum(["ADMIN", "ORDER_MANAGER", "PRODUCT_MANAGER"]),
});

const patchStaffSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["OWNER", "ADMIN", "ORDER_MANAGER", "PRODUCT_MANAGER"]).optional(),
  is_active: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi("*");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.profile.role !== "OWNER") {
    return NextResponse.json({ error: "OWNER_ONLY" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: userRes, error: authErr } =
    await supabase.auth.admin.createUser({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      email_confirm: true,
    });

  if (authErr || !userRes.user) {
    return NextResponse.json(
      { error: authErr?.message ?? "CREATE_USER_FAILED" },
      { status: 400 },
    );
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .insert({
      id: userRes.user.id,
      email: parsed.data.email.toLowerCase(),
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      is_active: true,
    })
    .select("*")
    .single();

  if (profErr) {
    await supabase.auth.admin.deleteUser(userRes.user.id);
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "STAFF_CREATED",
    entityType: "profile",
    entityId: profile.id,
    metadata: { email: profile.email, role: profile.role },
  });

  return NextResponse.json({ staff: profile }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi("*");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.profile.role !== "OWNER") {
    return NextResponse.json({ error: "OWNER_ONLY" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (parsed.data.id === auth.profile.id && parsed.data.is_active === false) {
    return NextResponse.json(
      { error: "CANNOT_DEACTIVATE_SELF" },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const updateObj: Record<string, unknown> = {};
  if (parsed.data.role) updateObj.role = parsed.data.role;
  if (typeof parsed.data.is_active === "boolean")
    updateObj.is_active = parsed.data.is_active;

  const { error } = await supabase
    .from("profiles")
    .update(updateObj)
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "STAFF_UPDATED",
    entityType: "profile",
    entityId: parsed.data.id,
    metadata: updateObj,
  });

  return NextResponse.json({ ok: true });
}
