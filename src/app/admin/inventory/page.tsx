import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminInventoryData } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { InventoryClient } from "@/components/admin/InventoryClient";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await requireAdminPage("inventory:read");
  const sp = await searchParams;
  const data = await getAdminInventoryData();

  return (
    <AdminShell profile={profile}>
      <InventoryClient
        variants={data.variants as never}
        movements={data.movements as never}
        initialFilter={sp.filter ?? "all"}
      />
    </AdminShell>
  );
}
