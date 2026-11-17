import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdminProfile } from "@/lib/auth/admin";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";

const localeSchema = z.object({
  locale: z.enum(["en", "ar"]),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = localeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_LOCALE" }, { status: 400 });
  }

  const profile = await getCurrentAdminProfile();
  if (profile && isAdminSupabaseConfigured()) {
    const adminDb = createSupabaseAdminClient();
    await adminDb
      .from("profiles")
      .update({ preferred_locale: parsed.data.locale })
      .eq("id", profile.id);
  }

  const res = NextResponse.json({ ok: true, locale: parsed.data.locale });
  res.cookies.set("ALVERO_ADMIN_LOCALE", parsed.data.locale, {
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
