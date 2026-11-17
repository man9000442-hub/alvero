"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  Boxes,
  ExternalLink,
  FolderTree,
  Globe,
  LayoutTemplate,
  LogOut,
  Menu,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { AdminPermission, AdminProfile, Locale } from "@/types/database";

const ROLE_ALLOW: Record<AdminProfile["role"], AdminPermission[]> = {
  OWNER: ["*"],
  ADMIN: [
    "dashboard:read",
    "products:read",
    "categories:read",
    "orders:read",
    "customers:read",
    "discounts:read",
    "shipping:read",
    "inventory:read",
    "content:read",
    "settings:read",
  ],
  ORDER_MANAGER: ["dashboard:read", "orders:read", "customers:read"],
  PRODUCT_MANAGER: [
    "dashboard:read",
    "products:read",
    "categories:read",
    "inventory:read",
  ],
};

function canSee(role: AdminProfile["role"], perm: AdminPermission): boolean {
  const list = ROLE_ALLOW[role] ?? [];
  return list.includes("*") || list.includes(perm);
}

export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
    perm: AdminPermission;
  }> = [
    {
      href: "/admin",
      label: t("nav.overview"),
      icon: <BarChart3 className="h-4 w-4" />,
      perm: "dashboard:read",
    },
    {
      href: "/admin/orders",
      label: t("nav.orders"),
      icon: <ShoppingBag className="h-4 w-4" />,
      perm: "orders:read",
    },
    {
      href: "/admin/products",
      label: t("nav.products"),
      icon: <Package className="h-4 w-4" />,
      perm: "products:read",
    },
    {
      href: "/admin/categories",
      label: t("nav.categories"),
      icon: <FolderTree className="h-4 w-4" />,
      perm: "categories:read",
    },
    {
      href: "/admin/inventory",
      label: t("nav.inventory"),
      icon: <Boxes className="h-4 w-4" />,
      perm: "inventory:read",
    },
    {
      href: "/admin/discounts",
      label: t("nav.discounts"),
      icon: <Percent className="h-4 w-4" />,
      perm: "discounts:read",
    },
    {
      href: "/admin/shipping",
      label: t("nav.shipping"),
      icon: <Truck className="h-4 w-4" />,
      perm: "shipping:read",
    },
    {
      href: "/admin/customers",
      label: t("nav.customers"),
      icon: <Users className="h-4 w-4" />,
      perm: "customers:read",
    },
    {
      href: "/admin/content",
      label: t("nav.content"),
      icon: <LayoutTemplate className="h-4 w-4" />,
      perm: "content:read",
    },
    {
      href: "/admin/settings",
      label: t("nav.settings"),
      icon: <Settings className="h-4 w-4" />,
      perm: "settings:read",
    },
  ];

  const visibleNav = navItems.filter((item) => canSee(profile.role, item.perm));

  const switchAdminLocale = async () => {
    const nextLocale = locale === "en" ? "ar" : "en";
    await fetch("/api/admin/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    router.refresh();
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-black text-white w-64">
      <div className="px-6 py-6 border-b border-[#222222]">
        <Link href="/admin" className="block">
          <span className="font-serif text-2xl tracking-[0.26em] text-white">
            ALVERO
          </span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-[#888888] mt-1">
            {t("brandSub")}
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 text-xs uppercase tracking-[0.12em] transition-colors ${
                active
                  ? "bg-white text-black font-semibold"
                  : "text-[#BBBBBB] hover:bg-[#161616] hover:text-white"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#222222] space-y-3 text-xs">
        <div className="px-2">
          <p className="font-medium text-white truncate">
            {profile.full_name || profile.email}
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#888888] mt-0.5">
            {t(`roles.${profile.role}`)}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Link
            href={`/${locale}`}
            target="_blank"
            className="flex items-center gap-2 px-2 py-1.5 text-[#CCCCCC] hover:text-white text-[11px] uppercase tracking-wider"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("nav.viewStore")}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-2 py-1.5 text-[#CCCCCC] hover:text-white text-[11px] uppercase tracking-wider cursor-pointer text-start"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("nav.signOut")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 no-print">{sidebarContent}</aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="fixed inset-y-0 start-0 z-50 flex"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="m-3 p-2 h-9 w-9 bg-white text-black border border-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-[#E5E5E5] px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 border border-[#E5E5E5] cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Badge variant="outline">{t(`roles.${profile.role}`)}</Badge>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={switchAdminLocale}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E5E5] hover:border-black text-xs uppercase tracking-wider cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              {locale === "en" ? "العربية" : "English"}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
