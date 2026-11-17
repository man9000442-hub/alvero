import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi("settings:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("website_settings")
    .update({
      brand_name: String(body.brand_name || "ALVERO").trim(),
      logo_url: body.logo_url || null,
      favicon_url: body.favicon_url || null,
      contact_phone: String(body.contact_phone ?? ""),
      whatsapp_number: String(body.whatsapp_number ?? ""),
      support_email: String(body.support_email ?? ""),
      instagram_url: String(body.instagram_url ?? ""),
      facebook_url: String(body.facebook_url ?? ""),
      tiktok_url: String(body.tiktok_url ?? ""),
      default_language: body.default_language === "ar" ? "ar" : "en",
      currency: "EGP",
      store_status: body.store_status === "PAUSED" ? "PAUSED" : "OPEN",
      maintenance_mode: Boolean(body.maintenance_mode),
      maintenance_message_en: String(body.maintenance_message_en ?? ""),
      maintenance_message_ar: String(body.maintenance_message_ar ?? ""),
      newsletter_enabled: Boolean(body.newsletter_enabled),
      order_notification_whatsapp_enabled: Boolean(
        body.order_notification_whatsapp_enabled,
      ),
      order_notification_email: String(body.order_notification_email ?? ""),
    })
    .eq("id", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "SETTINGS_UPDATED",
    entityType: "website_settings",
    entityId: "1",
  });

  revalidatePath("/en");
  revalidatePath("/ar");
  return NextResponse.json({ ok: true });
}
