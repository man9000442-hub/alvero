import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminOrders } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrdersListClient } from "@/components/admin/OrdersListClient";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const profile = await requireAdminPage("orders:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 25;

  const { orders, totalCount } = await getAdminOrders({
    status: sp.status,
    search: sp.search,
    from: sp.from,
    to: sp.to,
    page,
    pageSize,
  });

  return (
    <AdminShell profile={profile}>
      <OrdersListClient
        orders={orders}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        filters={{
          status: sp.status,
          search: sp.search,
          from: sp.from,
          to: sp.to,
        }}
      />
    </AdminShell>
  );
}
