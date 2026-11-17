import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminShippingData } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ShippingClient } from "@/components/admin/ShippingClient";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const profile = await requireAdminPage("shipping:read");
  const data = await getAdminShippingData();

  return (
    <AdminShell profile={profile}>
      <ShippingClient
        governorates={data.governorates}
        areas={data.areas}
        globalRule={data.globalRule}
      />
    </AdminShell>
  );
}
