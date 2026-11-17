import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminContentData } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ContentClient } from "@/components/admin/ContentClient";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const profile = await requireAdminPage("content:read");
  const data = await getAdminContentData();

  return (
    <AdminShell profile={profile}>
      <ContentClient
        banners={data.banners}
        sections={data.sections}
        pages={data.pages}
        settings={data.settings}
      />
    </AdminShell>
  );
}
