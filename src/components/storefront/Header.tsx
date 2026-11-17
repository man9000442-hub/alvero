"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, Search, ShoppingBag, Globe, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Drawer, Modal } from "@/components/ui/Modal";
import { useCart } from "./CartProvider";
import type { Category, Locale, WebsiteSettings } from "@/types/database";

export function Header({
  settings,
  categories,
}: {
  settings: WebsiteSettings;
  categories: Category[];
}) {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { totalQuantity, openDrawer } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const switchLanguage = () => {
    const nextLocale: Locale = locale === "en" ? "ar" : "en";
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.replace(pathname, { locale: nextLocale });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    setSearchOpen(false);
    router.push(q ? `/shop?search=${encodeURIComponent(q)}` : "/shop");
  };

  const announcementText =
    locale === "ar"
      ? settings.announcement_text_ar
      : settings.announcement_text_en;

  return (
    <>
      {settings.announcement_enabled && announcementText && (
        <div className="bg-black text-white text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-center py-2.5 px-4">
          {announcementText}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          {/* Mobile menu trigger + Desktop Left Nav */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t("menu")}
              className="lg:hidden p-1 text-black cursor-pointer"
            >
              <Menu className="h-5 w-5 stroke-[1.5]" />
            </button>

            <nav className="hidden lg:flex items-center gap-7 text-[11px] font-medium uppercase tracking-[0.16em]">
              <Link href="/shop" className="hover:opacity-60 transition-opacity">
                {t("shop")}
              </Link>
              <Link
                href="/shop?sort=newest"
                className="hover:opacity-60 transition-opacity"
              >
                {t("newArrivals")}
              </Link>
              <Link href="/about" className="hover:opacity-60 transition-opacity">
                {t("about")}
              </Link>
              <Link
                href="/track-order"
                className="hover:opacity-60 transition-opacity"
              >
                {t("trackOrder")}
              </Link>
            </nav>
          </div>

          {/* Center Brand Wordmark */}
          <Link
            href="/"
            className="font-serif text-2xl sm:text-[28px] font-medium tracking-[0.28em] text-black select-none"
          >
            {settings.brand_name || "ALVERO"}
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={switchLanguage}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.08em] text-black hover:opacity-60 transition-opacity cursor-pointer"
              aria-label="Switch language"
            >
              <Globe className="h-4 w-4 stroke-[1.5]" />
              <span className="hidden sm:inline">{t("language")}</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label={t("searchPlaceholder")}
              className="p-1 text-black hover:opacity-60 transition-opacity cursor-pointer"
            >
              <Search className="h-[18px] w-[18px] stroke-[1.5]" />
            </button>

            <button
              type="button"
              onClick={openDrawer}
              aria-label={t("bag")}
              className="relative inline-flex items-center gap-1.5 p-1 text-black hover:opacity-60 transition-opacity cursor-pointer"
            >
              <ShoppingBag className="h-[18px] w-[18px] stroke-[1.5]" />
              <span className="text-[11px] font-semibold tabular-nums">
                ({totalQuantity})
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title={settings.brand_name || "ALVERO"}
        side="start"
      >
        <div className="p-6 space-y-6">
          <nav className="flex flex-col space-y-4 text-sm uppercase tracking-[0.16em]">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 border-b border-[#F0F0F0]"
            >
              {t("home")}
            </Link>
            <Link
              href="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 border-b border-[#F0F0F0]"
            >
              {t("shop")}
            </Link>
            <Link
              href="/shop?sort=newest"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 border-b border-[#F0F0F0]"
            >
              {t("newArrivals")}
            </Link>
            <Link
              href="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 border-b border-[#F0F0F0]"
            >
              {t("trackOrder")}
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 border-b border-[#F0F0F0]"
            >
              {t("about")}
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 border-b border-[#F0F0F0]"
            >
              {t("contact")}
            </Link>
          </nav>

          {categories.length > 0 && (
            <div className="pt-2 space-y-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777]">
                {t("collections")}
              </p>
              <div className="flex flex-col space-y-2.5 text-xs uppercase tracking-[0.12em]">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/shop?category=${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-[#333333] hover:text-black"
                  >
                    {locale === "ar" ? cat.name_ar : cat.name_en}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                switchLanguage();
              }}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] font-medium cursor-pointer"
            >
              <Globe className="h-4 w-4" />
              {t("language")}
            </button>
          </div>
        </div>
      </Drawer>

      {/* Search Overlay Modal */}
      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title={settings.brand_name || "ALVERO"}
      >
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full h-12 px-4 pe-10 border border-black text-sm focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute end-3 top-3.5 text-[#777777] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="w-full h-11 bg-black text-white text-xs uppercase tracking-[0.16em] font-medium hover:bg-[#1a1a1a] cursor-pointer"
          >
            {t("searchPlaceholder").split(" ")[0]}
          </button>
        </form>
      </Modal>
    </>
  );
}
