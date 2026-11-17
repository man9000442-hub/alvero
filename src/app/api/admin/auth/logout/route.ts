import { NextResponse } from "next/server";
import { createSupabaseServerClient, isServerSupabaseConfigured } from "@/lib/supabase/server";

export async function POST() {
  if (isServerSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.json({ ok: true });
}
