import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminSettingsAndStaff } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { SettingsClient } from "@/components/admin/SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const profile = await requireAdminPage("settings:read");
  const data = await getAdminSettingsAndStaff();

  return (
    <AdminShell profile={profile}>
      <SettingsClient
        settings={data.settings}
        staff={data.staff}
        auditLogs={data.auditLogs}
        currentRole={profile.role}
      />
    </AdminShell>
  );
}
