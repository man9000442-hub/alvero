import React from "react";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminOrderById } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrderDetailClient } from "@/components/admin/OrderDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAdminPage("orders:read");
  const { id } = await params;
  const order = await getAdminOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <AdminShell profile={profile}>
      <OrderDetailClient order={order} />
    </AdminShell>
  );
}
