import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminCategories } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductFormClient } from "@/components/admin/ProductFormClient";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
  const profile = await requireAdminPage("products:write");
  const categories = await getAdminCategories();

  return (
    <AdminShell profile={profile}>
      <ProductFormClient categories={categories} />
    </AdminShell>
  );
}
