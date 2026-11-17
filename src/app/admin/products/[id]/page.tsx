import React from "react";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminCategories, getAdminProductById } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductFormClient } from "@/components/admin/ProductFormClient";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireAdminPage("products:write");
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProductById(id),
    getAdminCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <AdminShell profile={profile}>
      <ProductFormClient initialProduct={product} categories={categories} />
    </AdminShell>
  );
}
