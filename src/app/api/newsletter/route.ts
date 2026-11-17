import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";

const newsletterSchema = z.object({
  email: z.string().trim().email().max(160),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }

    if (!isAdminSupabaseConfigured()) {
      return NextResponse.json(
        { error: "DATABASE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data: settings } = await supabase
      .from("website_settings")
      .select("newsletter_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (!settings?.newsletter_enabled) {
      return NextResponse.json(
        { error: "NEWSLETTER_DISABLED" },
        { status: 403 },
      );
    }

    await supabase.from("newsletter_subscribers").upsert(
      {
        email: parsed.data.email.toLowerCase(),
        locale: parsed.data.locale,
      },
      { onConflict: "email" },
    );

    return NextResponse.json({ subscribed: true });
  } catch {
    return NextResponse.json({ error: "SUBSCRIPTION_FAILED" }, { status: 500 });
  }
}
