import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isServerSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-fA-F-]{36}$/.test(s))
    .slice(0, 30);

  if (ids.length === 0 || !isServerSupabaseConfigured()) {
    return NextResponse.json({ variantsByProduct: {} });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("product_variants")
    .select("*")
    .in("product_id", ids)
    .eq("is_available", true);

  const grouped: Record<string, unknown[]> = {};
  for (const v of data ?? []) {
    if (!grouped[v.product_id]) grouped[v.product_id] = [];
    grouped[v.product_id].push(v);
  }

  return NextResponse.json({ variantsByProduct: grouped });
}
