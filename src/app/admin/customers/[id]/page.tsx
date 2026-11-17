import React from "react";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminCustomerById } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { CustomerDetailClient } from "@/components/admin/CustomerDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAdminPage("customers:read");
  const { id } = await params;
  const { customer, orders } = await getAdminCustomerById(id);

  if (!customer) {
    notFound();
  }

  return (
    <AdminShell profile={profile}>
      <CustomerDetailClient customer={customer} orders={orders} />
    </AdminShell>
  );
}
