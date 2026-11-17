import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminCustomers } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { CustomersClient } from "@/components/admin/CustomersClient";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const profile = await requireAdminPage("customers:read");
  const sp = await searchParams;
  const customers = await getAdminCustomers(sp.search);

  return (
    <AdminShell profile={profile}>
      <CustomersClient customers={customers} initialSearch={sp.search ?? ""} />
    </AdminShell>
  );
}
