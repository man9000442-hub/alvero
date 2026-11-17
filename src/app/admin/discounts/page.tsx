import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import {
  getAdminCategories,
  getAdminDiscounts,
  getAdminProducts,
} from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { DiscountsClient } from "@/components/admin/DiscountsClient";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const profile = await requireAdminPage("discounts:read");
  const [discounts, productsRes, categories] = await Promise.all([
    getAdminDiscounts(),
    getAdminProducts({ page: 1, pageSize: 200 }),
    getAdminCategories(),
  ]);

  return (
    <AdminShell profile={profile}>
      <DiscountsClient
        discounts={discounts}
        products={productsRes.products}
        categories={categories}
      />
    </AdminShell>
  );
}
