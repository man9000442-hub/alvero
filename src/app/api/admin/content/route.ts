import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi, writeAuditLog } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi("content:write");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  if (body.kind === "announcement") {
    const { error } = await supabase
      .from("website_settings")
      .update({
        announcement_enabled: Boolean(body.announcement_enabled),
        announcement_text_en: String(body.announcement_text_en ?? ""),
        announcement_text_ar: String(body.announcement_text_ar ?? ""),
        newsletter_enabled: Boolean(body.newsletter_enabled),
        footer_links: Array.isArray(body.footer_links) ? body.footer_links : undefined,
      })
      .eq("id", 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.kind === "storefront_copy") {
    const updatePayload: Record<string, unknown> = {
      storefront_copy: body.storefront_copy ?? {},
    };
    if (Array.isArray(body.footer_links)) {
      updatePayload.footer_links = body.footer_links;
    }
    const { error } = await supabase
      .from("website_settings")
      .update(updatePayload)
      .eq("id", 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.kind === "banner") {
    if (body.id) {
      const { error } = await supabase
        .from("homepage_banners")
        .update({
          placement: body.placement,
          title_en: body.title_en,
          title_ar: body.title_ar,
          subtitle_en: body.subtitle_en,
          subtitle_ar: body.subtitle_ar,
          cta_label_en: body.cta_label_en,
          cta_label_ar: body.cta_label_ar,
          cta_url: body.cta_url,
          desktop_image_url: body.desktop_image_url,
          mobile_image_url: body.mobile_image_url,
          is_active: Boolean(body.is_active),
        })
        .eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await supabase.from("homepage_banners").insert({
        placement: body.placement ?? "HERO",
        title_en: body.title_en,
        title_ar: body.title_ar,
        subtitle_en: body.subtitle_en ?? "",
        subtitle_ar: body.subtitle_ar ?? "",
        cta_label_en: body.cta_label_en ?? "Explore",
        cta_label_ar: body.cta_label_ar ?? "تصفح",
        cta_url: body.cta_url ?? "/shop",
        desktop_image_url: body.desktop_image_url,
        mobile_image_url: body.mobile_image_url,
        is_active: Boolean(body.is_active ?? true),
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else if (body.kind === "section" && body.section_key) {
    const { error } = await supabase
      .from("homepage_sections")
      .upsert(
        {
          section_key: body.section_key,
          title_en: body.title_en,
          title_ar: body.title_ar,
          subtitle_en: body.subtitle_en ?? "",
          subtitle_ar: body.subtitle_ar ?? "",
          body_en: body.body_en ?? "",
          body_ar: body.body_ar ?? "",
          image_url: body.image_url || null,
          is_enabled: Boolean(body.is_enabled),
          sort_order: Number(body.sort_order ?? 0),
        },
        { onConflict: "section_key" },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.kind === "page" && body.slug) {
    const { error } = await supabase
      .from("content_pages")
      .upsert(
        {
          slug: body.slug,
          title_en: body.title_en,
          title_ar: body.title_ar,
          body_en: body.body_en,
          body_ar: body.body_ar,
          seo_title_en: body.seo_title_en || null,
          seo_title_ar: body.seo_title_ar || null,
          seo_description_en: body.seo_description_en || null,
          seo_description_ar: body.seo_description_ar || null,
        },
        { onConflict: "slug" },
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    return NextResponse.json({ error: "INVALID_CONTENT_KIND" }, { status: 400 });
  }

  await writeAuditLog({
    actor: auth.profile,
    action: "CONTENT_UPDATED",
    entityType: String(body.kind),
    entityId: String(body.id ?? body.section_key ?? body.slug ?? "1"),
  });

  revalidatePath("/en", "layout");
  revalidatePath("/ar", "layout");
  return NextResponse.json({ ok: true });
}
