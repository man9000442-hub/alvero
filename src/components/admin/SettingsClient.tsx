"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MediaUploader } from "./MediaUploader";
import type { AdminProfile, AdminRole, WebsiteSettings } from "@/types/database";

export function SettingsClient({
  settings,
  staff,
  auditLogs,
  currentRole,
}: {
  settings: WebsiteSettings;
  staff: AdminProfile[];
  auditLogs: Array<{
    id: string;
    actor_email: string | null;
    actor_role: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    created_at: string;
  }>;
  currentRole: AdminRole;
}) {
  const t = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const [staffModal, setStaffModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<
    "ADMIN" | "ORDER_MANAGER" | "PRODUCT_MANAGER"
  >("ORDER_MANAGER");

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast("Settings saved", "success");
        router.refresh();
      } else {
        showToast("Failed to save settings", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        full_name: newName,
        password: newPassword,
        role: newRole,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to add staff", "error");
      return;
    }
    setStaffModal(false);
    setNewEmail("");
    setNewName("");
    setNewPassword("");
    showToast("Staff account created", "success");
    router.refresh();
  };

  const toggleStaffActive = async (member: AdminProfile) => {
    const res = await fetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: member.id, is_active: !member.is_active }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json();
      showToast(d.error || "Failed", "error");
    }
  };

  return (
    <div className="space-y-10">
      <div className="pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("settings")}
        </h1>
      </div>

      {/* Store Settings Form */}
      <form
        onSubmit={saveSettings}
        className="bg-white border border-[#E5E5E5] p-6 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Brand Name"
            value={form.brand_name}
            onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
          />
          <Input
            label="Contact Phone"
            dir="ltr"
            value={form.contact_phone}
            onChange={(e) =>
              setForm({ ...form, contact_phone: e.target.value })
            }
          />
          <Input
            label="WhatsApp Number (Intl digits)"
            dir="ltr"
            value={form.whatsapp_number}
            onChange={(e) =>
              setForm({ ...form, whatsapp_number: e.target.value })
            }
          />
          <Input
            label="Support Email"
            dir="ltr"
            value={form.support_email}
            onChange={(e) =>
              setForm({ ...form, support_email: e.target.value })
            }
          />
          <Input
            label="Instagram URL"
            dir="ltr"
            value={form.instagram_url}
            onChange={(e) =>
              setForm({ ...form, instagram_url: e.target.value })
            }
          />
          <Input
            label="Facebook URL"
            dir="ltr"
            value={form.facebook_url}
            onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
          />
          <Input
            label="TikTok URL"
            dir="ltr"
            value={form.tiktok_url}
            onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })}
          />
          <Select
            label="Default Store Language"
            value={form.default_language}
            onChange={(e) =>
              setForm({
                ...form,
                default_language: e.target.value === "ar" ? "ar" : "en",
              })
            }
          >
            <option value="en">English (LTR)</option>
            <option value="ar">العربية (RTL)</option>
          </Select>
          <Select
            label="Store Status"
            value={form.store_status}
            onChange={(e) =>
              setForm({
                ...form,
                store_status: e.target.value === "PAUSED" ? "PAUSED" : "OPEN",
              })
            }
          >
            <option value="OPEN">OPEN (Accepting COD Orders)</option>
            <option value="PAUSED">PAUSED (Checkout Disabled)</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Input
              label="Logo URL"
              value={form.logo_url ?? ""}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            />
            <MediaUploader
              folder="brand"
              label="Upload Logo"
              onUploaded={(url) => setForm({ ...form, logo_url: url })}
            />
          </div>
          <div className="space-y-2">
            <Input
              label="Favicon URL"
              value={form.favicon_url ?? ""}
              onChange={(e) =>
                setForm({ ...form, favicon_url: e.target.value })
              }
            />
            <MediaUploader
              folder="brand"
              label="Upload Favicon"
              onUploaded={(url) => setForm({ ...form, favicon_url: url })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Maintenance Message (EN)"
            value={form.maintenance_message_en}
            onChange={(e) =>
              setForm({ ...form, maintenance_message_en: e.target.value })
            }
          />
          <Input
            label="Maintenance Message (AR)"
            dir="rtl"
            value={form.maintenance_message_ar}
            onChange={(e) =>
              setForm({ ...form, maintenance_message_ar: e.target.value })
            }
          />
        </div>

        <div className="flex flex-wrap gap-6 text-xs pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.maintenance_mode}
              onChange={(e) =>
                setForm({ ...form, maintenance_mode: e.target.checked })
              }
              className="accent-black"
            />
            Enable Maintenance Mode
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.newsletter_enabled}
              onChange={(e) =>
                setForm({ ...form, newsletter_enabled: e.target.checked })
              }
              className="accent-black"
            />
            Enable Homepage Newsletter Section
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.order_notification_whatsapp_enabled}
              onChange={(e) =>
                setForm({
                  ...form,
                  order_notification_whatsapp_enabled: e.target.checked,
                })
              }
              className="accent-black"
            />
            Enable Customer WhatsApp Order Confirmation Link
          </label>
        </div>

        <Button type="submit" variant="primary" loading={saving}>
          {tc("save")}
        </Button>
      </form>

      {/* Staff Management (OWNER ONLY) */}
      {currentRole === "OWNER" && (
        <section className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
              Administrator Team & Role-Based Access
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStaffModal(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Staff
            </Button>
          </div>
          <div className="divide-y divide-[#F0F0F0] text-xs">
            {staff.map((m) => (
              <div
                key={m.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium">
                    {m.full_name} ({m.email})
                  </p>
                  <p className="text-[11px] text-[#777777]">{m.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleStaffActive(m)}
                  className="cursor-pointer"
                >
                  <Badge variant={m.is_active ? "solid" : "subtle"}>
                    {m.is_active ? tc("active") : tc("inactive")}
                  </Badge>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Audit Logs */}
      <section className="bg-white border border-[#E5E5E5] p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
          Security & Operations Audit Log
        </h2>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="border-b border-[#E5E5E5] text-[10px] uppercase tracking-wider text-[#777777]">
              <tr>
                <th className="py-2 px-3 text-start">Time</th>
                <th className="py-2 px-3 text-start">Actor</th>
                <th className="py-2 px-3 text-start">Role</th>
                <th className="py-2 px-3 text-start">Action</th>
                <th className="py-2 px-3 text-start">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F3F3]">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2 px-3 text-[#777777] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 px-3">{log.actor_email ?? "System"}</td>
                  <td className="py-2 px-3">{log.actor_role ?? "—"}</td>
                  <td className="py-2 px-3 font-medium">{log.action}</td>
                  <td className="py-2 px-3 text-[#666666]">
                    {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)})` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={staffModal}
        onClose={() => setStaffModal(false)}
        title="Add Administrator"
      >
        <form onSubmit={createStaff} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            required
            dir="ltr"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Input
            label="Initial Password (min 8 chars)"
            type="password"
            required
            minLength={8}
            dir="ltr"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Select
            label="Role"
            value={newRole}
            onChange={(e) =>
              setNewRole(
                e.target.value as "ADMIN" | "ORDER_MANAGER" | "PRODUCT_MANAGER",
              )
            }
          >
            <option value="ADMIN">ADMIN</option>
            <option value="ORDER_MANAGER">ORDER_MANAGER</option>
            <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
          </Select>
          <Button type="submit" variant="primary" fullWidth>
            Create Staff Account
          </Button>
        </form>
      </Modal>
    </div>
  );
}
