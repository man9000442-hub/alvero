"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MediaUploader } from "./MediaUploader";
import type { Category, Locale } from "@/types/database";

export function CategoriesClient({
  categories,
}: {
  categories: Category[];
}) {
  const t = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setNameEn("");
    setNameAr("");
    setSlug("");
    setParentId("");
    setDescEn("");
    setDescAr("");
    setImageUrl("");
    setSortOrder(String(categories.length + 1));
    setIsActive(true);
    setIsFeatured(true);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setNameEn(cat.name_en);
    setNameAr(cat.name_ar);
    setSlug(cat.slug);
    setParentId(cat.parent_id ?? "");
    setDescEn(cat.description_en);
    setDescAr(cat.description_ar);
    setImageUrl(cat.image_url ?? "");
    setSortOrder(String(cat.sort_order));
    setIsActive(cat.is_active);
    setIsFeatured(cat.is_featured);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing
        ? `/api/admin/categories/${editing.id}`
        : "/api/admin/categories";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: parentId || null,
          slug: slug.trim(),
          name_en: nameEn.trim(),
          name_ar: nameAr.trim(),
          description_en: descEn,
          description_ar: descAr,
          image_url: imageUrl.trim() || null,
          sort_order: Number(sortOrder) || 0,
          is_active: isActive,
          is_featured: isFeatured,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Save failed", "error");
        return;
      }
      setModalOpen(false);
      showToast("Category saved", "success");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("Category deleted", "success");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("categories")}
        </h1>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          {tc("create")}
        </Button>
      </div>

      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[10px] uppercase tracking-[0.14em] text-[#777777]">
            <tr>
              <th className="py-3.5 px-4 text-start">Category</th>
              <th className="py-3.5 px-4 text-start">Slug</th>
              <th className="py-3.5 px-4 text-start">Order</th>
              <th className="py-3.5 px-4 text-start">Status</th>
              <th className="py-3.5 px-4 text-end">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {cat.image_url && (
                      <div className="relative w-10 h-12 bg-[#F5F5F5] border border-[#E5E5E5]">
                        <Image
                          src={cat.image_url}
                          alt={cat.name_en}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">
                        {locale === "ar" ? cat.name_ar : cat.name_en}
                      </p>
                      <p className="text-[11px] text-[#777777]">
                        {locale === "ar" ? cat.name_en : cat.name_ar}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-[#666666]">{cat.slug}</td>
                <td className="py-3 px-4 tabular-nums">{cat.sort_order}</td>
                <td className="py-3 px-4 space-x-1">
                  <Badge variant={cat.is_active ? "solid" : "subtle"}>
                    {cat.is_active ? tc("active") : tc("inactive")}
                  </Badge>
                  {cat.is_featured && <Badge variant="outline">Featured</Badge>}
                </td>
                <td className="py-3 px-4 text-end space-x-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    className="p-1.5 border border-[#E5E5E5] hover:border-black cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 border border-[#E5E5E5] hover:border-black cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? tc("edit") : tc("create")}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name (EN)"
            required
            value={nameEn}
            onChange={(e) => {
              setNameEn(e.target.value);
              if (!editing) {
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, ""),
                );
              }
            }}
          />
          <Input
            label="Name (AR)"
            required
            dir="rtl"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
          />
          <Input
            label="Slug"
            required
            dir="ltr"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <Select
            label="Parent Category"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">None (Top Level)</option>
            {categories
              .filter((c) => c.id !== editing?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_en}
                </option>
              ))}
          </Select>
          <Textarea
            label="Description (EN)"
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
          />
          <Textarea
            label="Description (AR)"
            dir="rtl"
            value={descAr}
            onChange={(e) => setDescAr(e.target.value)}
          />
          <div className="space-y-2">
            <Input
              label="Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <MediaUploader
              folder="categories"
              onUploaded={(url) => setImageUrl(url)}
            />
          </div>
          <Input
            label="Sort Order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <div className="flex gap-6 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-black"
              />
              Active
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="accent-black"
              />
              Featured on Homepage
            </label>
          </div>
          <Button type="submit" variant="primary" fullWidth loading={saving}>
            {tc("save")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
