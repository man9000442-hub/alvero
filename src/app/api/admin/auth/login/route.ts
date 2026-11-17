import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, isServerSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";
import { checkAndConsumeRateLimit, resetRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 400 },
      );
    }

    const emailLower = parsed.data.email.toLowerCase();
    const rateKey = `admin_login:${ip}:${emailLower}`;
    const rate = await checkAndConsumeRateLimit({
      key: rateKey,
      maxAttempts: 5,
      windowSeconds: 900,
      blockSeconds: 900,
    });

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", retryAfterSeconds: rate.retryAfterSeconds },
        { status: 429 },
      );
    }

    if (!isServerSupabaseConfigured() || !isAdminSupabaseConfigured()) {
      return NextResponse.json(
        { error: "SUPABASE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailLower,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    const adminDb = createSupabaseAdminClient();
    const { data: profile } = await adminDb
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "ACCOUNT_INACTIVE" },
        { status: 403 },
      );
    }

    await resetRateLimit(rateKey);

    await adminDb
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", profile.id);

    await adminDb.from("audit_logs").insert({
      actor_id: profile.id,
      actor_email: profile.email,
      actor_role: profile.role,
      action: "ADMIN_LOGIN",
      entity_type: "profile",
      entity_id: profile.id,
      metadata: { ip },
    });

    return NextResponse.json({
      ok: true,
      role: profile.role,
      preferredLocale: profile.preferred_locale,
    });
  } catch {
    return NextResponse.json({ error: "LOGIN_FAILED" }, { status: 500 });
  }
}
