import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, isServerSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "@/lib/supabase/admin";
import type { AdminPermission, AdminProfile, AdminRole } from "@/types/database";

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  OWNER: ["*"],
  ADMIN: [
    "dashboard:read",
    "products:read",
    "products:write",
    "categories:read",
    "categories:write",
    "orders:read",
    "orders:write",
    "customers:read",
    "customers:write",
    "discounts:read",
    "discounts:write",
    "shipping:read",
    "shipping:write",
    "inventory:read",
    "inventory:write",
    "content:read",
    "content:write",
    "settings:read",
    "settings:write",
  ],
  ORDER_MANAGER: [
    "dashboard:read",
    "orders:read",
    "orders:write",
    "customers:read",
    "customers:write",
  ],
  PRODUCT_MANAGER: [
    "dashboard:read",
    "products:read",
    "products:write",
    "categories:read",
    "categories:write",
    "inventory:read",
    "inventory:write",
  ],
};

export function roleHasPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(permission);
}

export async function getCurrentAdminProfile(): Promise<AdminProfile | null> {
  if (!isServerSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const reader = isAdminSupabaseConfigured()
      ? createSupabaseAdminClient()
      : supabase;

    const { data: profile } = await reader
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.is_active) return null;
    return profile as AdminProfile;
  } catch {
    return null;
  }
}

export async function requireAdminPage(
  permission?: AdminPermission,
): Promise<AdminProfile> {
  const profile = await getCurrentAdminProfile();
  if (!profile) {
    redirect("/admin/login");
  }
  if (permission && !roleHasPermission(profile.role, permission)) {
    redirect("/admin?unauthorized=1");
  }
  return profile;
}

export async function requireAdminApi(
  permission?: AdminPermission,
): Promise<
  | { ok: true; profile: AdminProfile }
  | { ok: false; status: number; error: string }
> {
  const profile = await getCurrentAdminProfile();
  if (!profile) {
    return { ok: false, status: 401, error: "UNAUTHORIZED" };
  }
  if (permission && !roleHasPermission(profile.role, permission)) {
    return { ok: false, status: 403, error: "FORBIDDEN" };
  }
  return { ok: true, profile };
}

export async function writeAuditLog(params: {
  actor: AdminProfile;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isAdminSupabaseConfigured()) return;
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("audit_logs").insert({
      actor_id: params.actor.id,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Non-blocking audit insert
  }
}
