"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale, WebsiteSettings } from "@/types/database";

export function Footer({ settings }: { settings: WebsiteSettings }) {
  const t = useTranslations("footer");
  const locale = useLocale() as Locale;
  const year = new Date().getFullYear();

  const links = settings.footer_links ?? [];
  const clientCare = links.filter((l) => l.group === "client_care");
  const house = links.filter((l) => l.group === "house");
  const legal = links.filter((l) => l.group === "legal");
  const copy = settings.storefront_copy;

  const codBadgeText =
    (locale === "ar" ? copy?.footer_cod_badge_ar : copy?.footer_cod_badge_en) ||
    t("codBadge");
  const bottomNoteText =
    (locale === "ar"
      ? copy?.footer_bottom_note_ar
      : copy?.footer_bottom_note_en) || "EGP · CASH ON DELIVERY";
  const copyrightRaw =
    (locale === "ar"
      ? copy?.footer_copyright_ar
      : copy?.footer_copyright_en) || t("rights", { year });
  const copyrightText = copyrightRaw.replace("{year}", String(year));

  return (
    <footer className="bg-black text-white border-t border-[#222222] mt-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4 space-y-4">
            <p className="font-serif text-3xl tracking-[0.28em]">
              {settings.brand_name || "ALVERO"}
            </p>
            <p className="text-xs text-[#999999] leading-relaxed max-w-xs">
              {codBadgeText}
            </p>
            <div className="pt-2 space-y-1 text-xs text-[#BBBBBB]">
              {settings.support_email && <p>{settings.support_email}</p>}
              {settings.contact_phone && <p dir="ltr">{settings.contact_phone}</p>}
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#777777]">
              {t("clientCare")}
            </h4>
            <ul className="space-y-2.5 text-xs">
              {clientCare.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[#E5E5E5] hover:text-white hover:underline underline-offset-4"
                  >
                    {locale === "ar" ? link.label_ar : link.label_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#777777]">
              {t("house")}
            </h4>
            <ul className="space-y-2.5 text-xs">
              {house.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[#E5E5E5] hover:text-white hover:underline underline-offset-4"
                  >
                    {locale === "ar" ? link.label_ar : link.label_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#777777]">
              {t("legal")}
            </h4>
            <ul className="space-y-2.5 text-xs">
              {legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[#E5E5E5] hover:text-white hover:underline underline-offset-4"
                  >
                    {locale === "ar" ? link.label_ar : link.label_en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-[11px] uppercase tracking-[0.18em] text-[#777777]">
              {t("connect")}
            </h4>
            <ul className="space-y-2.5 text-xs text-[#E5E5E5]">
              {settings.instagram_url && (
                <li>
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline underline-offset-4"
                  >
                    Instagram
                  </a>
                </li>
              )}
              {settings.facebook_url && (
                <li>
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline underline-offset-4"
                  >
                    Facebook
                  </a>
                </li>
              )}
              {settings.tiktok_url && (
                <li>
                  <a
                    href={settings.tiktok_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline underline-offset-4"
                  >
                    TikTok
                  </a>
                </li>
              )}
              {settings.whatsapp_number && (
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline underline-offset-4"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-[#222222] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#777777] tracking-[0.1em] uppercase">
          <p>{copyrightText}</p>
          <p>{bottomNoteText}</p>
        </div>
      </div>
    </footer>
  );
}
