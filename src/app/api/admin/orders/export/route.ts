import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function escapeCsv(val: unknown): string {
  const s = String(val ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi("orders:read");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (status && status !== "ALL") query = query.eq("status", status);
  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  if (search?.trim()) {
    const s = search.trim().replace(/[%_,]/g, "");
    query = query.or(
      `order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`,
    );
  }

  const { data } = await query;
  const rows = data ?? [];

  const header = [
    "Order Number",
    "Date",
    "Customer Name",
    "Phone",
    "Governorate",
    "City",
    "District",
    "Address",
    "Payment Method",
    "Subtotal (EGP)",
    "Discount (EGP)",
    "Shipping (EGP)",
    "Total (EGP)",
    "Status",
  ];

  const lines = [
    header.map(escapeCsv).join(","),
    ...rows.map((r) =>
      [
        r.order_number,
        r.created_at,
        r.customer_name,
        r.customer_phone,
        r.governorate_name_en,
        r.city,
        r.district,
        `${r.full_address} Bld ${r.building_number}`,
        r.payment_method,
        r.subtotal,
        r.discount_amount,
        r.shipping_fee,
        r.total_amount,
        r.status,
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ];

  const csvContent = `\uFEFF${lines.join("\r\n")}`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alvero-orders-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
