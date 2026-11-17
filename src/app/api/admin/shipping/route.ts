import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi("shipping:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  if (body.kind === "governorate") {
    const { data, error } = await supabase
      .from("governorates")
      .insert({
        code: String(body.code).toUpperCase().trim(),
        name_en: String(body.name_en).trim(),
        name_ar: String(body.name_ar).trim(),
        shipping_fee: Number(body.shipping_fee ?? 70),
        free_shipping_threshold:
          body.free_shipping_threshold !== "" &&
          body.free_shipping_threshold !== null &&
          body.free_shipping_threshold !== undefined
            ? Number(body.free_shipping_threshold)
            : null,
        estimated_days_min: Number(body.estimated_days_min ?? 2),
        estimated_days_max: Number(body.estimated_days_max ?? 4),
        is_active: body.is_active ?? true,
        sort_order: Number(body.sort_order ?? 99),
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await writeAuditLog({
      actor: auth.profile,
      action: "GOVERNORATE_CREATED",
      entityType: "governorate",
      entityId: data.id,
    });
    return NextResponse.json({ item: data }, { status: 201 });
  }

  if (body.kind === "area") {
    const { data, error } = await supabase
      .from("delivery_areas")
      .insert({
        governorate_id: body.governorate_id,
        name_en: String(body.name_en).trim(),
        name_ar: String(body.name_ar).trim(),
        shipping_fee_override:
          body.shipping_fee_override !== "" &&
          body.shipping_fee_override !== null &&
          body.shipping_fee_override !== undefined
            ? Number(body.shipping_fee_override)
            : null,
        is_active: body.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ item: data }, { status: 201 });
  }

  return NextResponse.json({ error: "INVALID_KIND" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi("shipping:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  if (body.kind === "global_rule") {
    const { error } = await supabase
      .from("shipping_rules")
      .update({
        default_shipping_fee: Number(body.default_shipping_fee),
        free_shipping_threshold:
          body.free_shipping_threshold !== "" &&
          body.free_shipping_threshold !== null
            ? Number(body.free_shipping_threshold)
            : null,
        is_free_shipping_enabled: Boolean(body.is_free_shipping_enabled),
      })
      .eq("id", 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await writeAuditLog({
      actor: auth.profile,
      action: "SHIPPING_RULES_UPDATED",
      entityType: "shipping_rules",
      entityId: "1",
    });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "governorate" && body.id) {
    const { error } = await supabase
      .from("governorates")
      .update({
        shipping_fee: Number(body.shipping_fee),
        free_shipping_threshold:
          body.free_shipping_threshold !== "" &&
          body.free_shipping_threshold !== null &&
          body.free_shipping_threshold !== undefined
            ? Number(body.free_shipping_threshold)
            : null,
        estimated_days_min: Number(body.estimated_days_min ?? 2),
        estimated_days_max: Number(body.estimated_days_max ?? 4),
        is_active: Boolean(body.is_active),
      })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "area" && body.id) {
    const { error } = await supabase
      .from("delivery_areas")
      .update({
        shipping_fee_override:
          body.shipping_fee_override !== "" &&
          body.shipping_fee_override !== null &&
          body.shipping_fee_override !== undefined
            ? Number(body.shipping_fee_override)
            : null,
        is_active: Boolean(body.is_active),
      })
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "INVALID_KIND" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminApi("shipping:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const kind = request.nextUrl.searchParams.get("kind");
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const table = kind === "area" ? "delivery_areas" : "governorates";
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
