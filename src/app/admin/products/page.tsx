import React from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminProducts } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductsListClient } from "@/components/admin/ProductsListClient";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const profile = await requireAdminPage("products:read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 20;

  const { products, totalCount } = await getAdminProducts({
    search: sp.search,
    status: sp.status,
    page,
    pageSize,
  });

  return (
    <AdminShell profile={profile}>
      <ProductsListClient
        products={products}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        filters={{ search: sp.search, status: sp.status }}
      />
    </AdminShell>
  );
}
