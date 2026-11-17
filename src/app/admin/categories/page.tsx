import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminCategories } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { CategoriesClient } from "@/components/admin/CategoriesClient";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const profile = await requireAdminPage("categories:read");
  const categories = await getAdminCategories();

  return (
    <AdminShell profile={profile}>
      <CategoriesClient categories={categories} />
    </AdminShell>
  );
}
