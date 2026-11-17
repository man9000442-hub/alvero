import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import {
  getAdminOverviewMetrics,
  type DatePreset,
} from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { OverviewClient } from "@/components/admin/OverviewClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const profile = await requireAdminPage("dashboard:read");
  const sp = await searchParams;
  const validPresets: DatePreset[] = ["today", "7d", "30d", "month", "custom"];
  const preset: DatePreset = validPresets.includes(sp.preset as DatePreset)
    ? (sp.preset as DatePreset)
    : "30d";

  const metrics = await getAdminOverviewMetrics(preset, sp.from, sp.to);

  return (
    <AdminShell profile={profile}>
      <OverviewClient
        metrics={metrics}
        preset={preset}
        fromDate={sp.from}
        toDate={sp.to}
      />
    </AdminShell>
  );
}
