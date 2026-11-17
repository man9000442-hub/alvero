"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MediaUploader } from "./MediaUploader";
import type {
  ContentPage,
  FooterLinkItem,
  HomepageBanner,
  HomepageSection,
  StorefrontCopy,
  WebsiteSettings,
} from "@/types/database";

const SECTION_KEYS = [
  { key: "featured_collections", defaultEn: "CURATED COLLECTIONS", defaultAr: "المجموعات المختارة" },
  { key: "new_arrivals", defaultEn: "NEW ARRIVALS", defaultAr: "وصل حديثاً" },
  { key: "best_sellers", defaultEn: "SIGNATURE PIECES", defaultAr: "الأكثر مبيعاً" },
  { key: "featured_products", defaultEn: "EDITOR'S SELECTION", defaultAr: "اختيارات المحرر" },
  { key: "brand_identity", defaultEn: "FORM WITHOUT EXCESS", defaultAr: "الشكل دون إفراط" },
  { key: "newsletter", defaultEn: "PRIVATE ARCHIVE ACCESS", defaultAr: "دخول الأرشيف الخاص" },
];

export function ContentClient({
  banners,
  sections,
  pages,
  settings,
}: {
  banners: HomepageBanner[];
  sections: HomepageSection[];
  pages: ContentPage[];
  settings: WebsiteSettings;
}) {
  const t = useTranslations("admin.nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const { showToast } = useToast();

  // 1. Announcement state
  const [annEnabled, setAnnEnabled] = useState(settings.announcement_enabled);
  const [annEn, setAnnEn] = useState(settings.announcement_text_en);
  const [annAr, setAnnAr] = useState(settings.announcement_text_ar);

  // 2. Storefront Copy & Footer Links state
  const [copyState, setCopyState] = useState<StorefrontCopy>(
    settings.storefront_copy,
  );
  const [footerLinks, setFooterLinks] = useState<FooterLinkItem[]>(
    settings.footer_links ?? [],
  );

  // 3. Hero Banner state
  const hero = banners.find((b) => b.placement === "HERO") ?? {
    id: "",
    placement: "HERO" as const,
    title_en: "MONOCHROME ARCHITECTURE",
    title_ar: "العمارة الأحادية",
    subtitle_en: "Tailored essentials crafted in pure black and stark white.",
    subtitle_ar: "أساسيات مفصّلة بدقة باللونين الأسود النقي والأبيض الصافي.",
    cta_label_en: "Explore Collection",
    cta_label_ar: "استكشف المجموعة",
    cta_url: "/shop",
    desktop_image_url: "/images/editorial-hero.svg",
    mobile_image_url: "/images/editorial-hero-mobile.svg",
    is_active: true,
    sort_order: 1,
  };
  const [heroState, setHeroState] = useState(hero);

  // 4. Campaign Banner state
  const campaign = banners.find((b) => b.placement === "CAMPAIGN") ?? {
    id: "",
    placement: "CAMPAIGN" as const,
    title_en: "HEAVYWEIGHT JERSEY CAPSULE",
    title_ar: "كبسولة الجيرسيه الثقيل",
    subtitle_en: "340 GSM combed cotton tees and structured outerwear.",
    subtitle_ar: "تيشيرتات قطن مصري 340 جم ومعاطف بتفصيل حاد.",
    cta_label_en: "Shop the Capsule",
    cta_label_ar: "تسوق الكبسولة",
    cta_url: "/shop?sort=newest",
    desktop_image_url: "/images/editorial-campaign.svg",
    mobile_image_url: "/images/editorial-campaign.svg",
    is_active: true,
    sort_order: 2,
  };
  const [campaignState, setCampaignState] = useState(campaign);

  // 5. Homepage Sections state
  const [activeSecKey, setActiveSecKey] = useState("brand_identity");
  const getSectionObj = (key: string): HomepageSection => {
    const existing = sections.find((s) => s.section_key === key);
    if (existing) return existing;
    const meta = SECTION_KEYS.find((k) => k.key === key);
    return {
      id: "",
      section_key: key,
      title_en: meta?.defaultEn ?? key,
      title_ar: meta?.defaultAr ?? key,
      subtitle_en: "",
      subtitle_ar: "",
      body_en: "",
      body_ar: "",
      image_url: key === "brand_identity" ? "/images/editorial-brand.svg" : null,
      is_enabled: true,
      sort_order: 1,
      config: {},
    };
  };
  const [sectionDraft, setSectionDraft] = useState<HomepageSection>(() =>
    getSectionObj("brand_identity"),
  );

  // 6. Content Pages
  const [activePageSlug, setActivePageSlug] = useState(
    pages[0]?.slug ?? "about",
  );
  const currentPage = pages.find((p) => p.slug === activePageSlug) ?? {
    slug: activePageSlug,
    title_en: activePageSlug.toUpperCase(),
    title_ar: activePageSlug,
    body_en: "",
    body_ar: "",
    seo_title_en: "",
    seo_title_ar: "",
    seo_description_en: "",
    seo_description_ar: "",
    updated_at: "",
  };
  const [pageDraft, setPageDraft] = useState(currentPage);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const selectSection = (key: string) => {
    setActiveSecKey(key);
    setSectionDraft(getSectionObj(key));
  };

  const selectPage = (slug: string) => {
    setActivePageSlug(slug);
    const found = pages.find((p) => p.slug === slug);
    if (found) {
      setPageDraft(found);
    } else {
      setPageDraft({
        slug,
        title_en: slug,
        title_ar: slug,
        body_en: "",
        body_ar: "",
        seo_title_en: "",
        seo_title_ar: "",
        seo_description_en: "",
        seo_description_ar: "",
        updated_at: "",
      });
    }
  };

  const saveContent = async (key: string, payload: Record<string, unknown>) => {
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("Content updated", "success");
        router.refresh();
      } else {
        showToast("Update failed", "error");
      }
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-10">
      <div className="pb-5 border-b border-[#E5E5E5]">
        <h1 className="font-serif text-3xl uppercase tracking-[0.12em]">
          {t("content")}
        </h1>
      </div>

      {/* 1. Announcement Bar */}
      <section className="bg-white border border-[#E5E5E5] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            Announcement Bar (Top Promo / Shipping Banner)
          </h2>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={annEnabled}
              onChange={(e) => setAnnEnabled(e.target.checked)}
              className="accent-black"
            />
            Enabled
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Announcement (EN)"
            value={annEn}
            onChange={(e) => setAnnEn(e.target.value)}
          />
          <Input
            label="Announcement (AR)"
            dir="rtl"
            value={annAr}
            onChange={(e) => setAnnAr(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={savingKey === "announcement"}
          onClick={() =>
            saveContent("announcement", {
              kind: "announcement",
              announcement_enabled: annEnabled,
              announcement_text_en: annEn,
              announcement_text_ar: annAr,
              newsletter_enabled: settings.newsletter_enabled,
            })
          }
        >
          {tc("save")}
        </Button>
      </section>

      {/* 2. Editable Storefront Copy (Delivery Pillars, COD Notices, Footer Texts) */}
      <section className="bg-white border border-[#E5E5E5] p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#E5E5E5]">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            Editable Storefront Copy (Delivery, COD, Pillars & Footer Texts)
          </h2>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={copyState.pillars_enabled}
              onChange={(e) =>
                setCopyState({ ...copyState, pillars_enabled: e.target.checked })
              }
              className="accent-black"
            />
            Show 3 Value Pillars Strip
          </label>
        </div>

        {/* Hero Eyebrow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Hero Top Tagline (EN)"
            value={copyState.hero_eyebrow_en}
            onChange={(e) =>
              setCopyState({ ...copyState, hero_eyebrow_en: e.target.value })
            }
          />
          <Input
            label="Hero Top Tagline (AR)"
            dir="rtl"
            value={copyState.hero_eyebrow_ar}
            onChange={(e) =>
              setCopyState({ ...copyState, hero_eyebrow_ar: e.target.value })
            }
          />
        </div>

        {/* 3 Value Pillars */}
        <div className="space-y-4 pt-2 border-t border-[#F0F0F0]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#777777]">
            Homepage 3 Value Pillars (Shipping / Craft / Exchange)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Pillar 1 Title (EN)"
              value={copyState.pillar_1_title_en}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_1_title_en: e.target.value })
              }
            />
            <Input
              label="Pillar 1 Title (AR)"
              dir="rtl"
              value={copyState.pillar_1_title_ar}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_1_title_ar: e.target.value })
              }
            />
            <Input
              label="Pillar 1 Description (EN)"
              value={copyState.pillar_1_desc_en}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_1_desc_en: e.target.value })
              }
            />
            <Input
              label="Pillar 1 Description (AR)"
              dir="rtl"
              value={copyState.pillar_1_desc_ar}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_1_desc_ar: e.target.value })
              }
            />

            <Input
              label="Pillar 2 Title (EN)"
              value={copyState.pillar_2_title_en}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_2_title_en: e.target.value })
              }
            />
            <Input
              label="Pillar 2 Title (AR)"
              dir="rtl"
              value={copyState.pillar_2_title_ar}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_2_title_ar: e.target.value })
              }
            />
            <Input
              label="Pillar 2 Description (EN)"
              value={copyState.pillar_2_desc_en}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_2_desc_en: e.target.value })
              }
            />
            <Input
              label="Pillar 2 Description (AR)"
              dir="rtl"
              value={copyState.pillar_2_desc_ar}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_2_desc_ar: e.target.value })
              }
            />

            <Input
              label="Pillar 3 Title (EN)"
              value={copyState.pillar_3_title_en}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_3_title_en: e.target.value })
              }
            />
            <Input
              label="Pillar 3 Title (AR)"
              dir="rtl"
              value={copyState.pillar_3_title_ar}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_3_title_ar: e.target.value })
              }
            />
            <Input
              label="Pillar 3 Description (EN)"
              value={copyState.pillar_3_desc_en}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_3_desc_en: e.target.value })
              }
            />
            <Input
              label="Pillar 3 Description (AR)"
              dir="rtl"
              value={copyState.pillar_3_desc_ar}
              onChange={(e) =>
                setCopyState({ ...copyState, pillar_3_desc_ar: e.target.value })
              }
            />
          </div>
        </div>

        {/* Product, Cart, Checkout COD & Shipping Copy */}
        <div className="space-y-4 pt-2 border-t border-[#F0F0F0]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#777777]">
            Product Shipping, Cart & COD Checkout Texts
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Product Delivery Title (EN)"
              value={copyState.product_shipping_title_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  product_shipping_title_en: e.target.value,
                })
              }
            />
            <Input
              label="Product Delivery Title (AR)"
              dir="rtl"
              value={copyState.product_shipping_title_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  product_shipping_title_ar: e.target.value,
                })
              }
            />
            <Textarea
              label="Product Delivery Description (EN)"
              value={copyState.product_shipping_desc_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  product_shipping_desc_en: e.target.value,
                })
              }
            />
            <Textarea
              label="Product Delivery Description (AR)"
              dir="rtl"
              value={copyState.product_shipping_desc_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  product_shipping_desc_ar: e.target.value,
                })
              }
            />
            <Input
              label="Cart COD Notice (EN)"
              value={copyState.cart_cod_notice_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  cart_cod_notice_en: e.target.value,
                })
              }
            />
            <Input
              label="Cart COD Notice (AR)"
              dir="rtl"
              value={copyState.cart_cod_notice_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  cart_cod_notice_ar: e.target.value,
                })
              }
            />
            <Input
              label="Checkout Subtitle (EN)"
              value={copyState.checkout_subtitle_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  checkout_subtitle_en: e.target.value,
                })
              }
            />
            <Input
              label="Checkout Subtitle (AR)"
              dir="rtl"
              value={copyState.checkout_subtitle_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  checkout_subtitle_ar: e.target.value,
                })
              }
            />
            <Input
              label="Checkout COD Box Title (EN)"
              value={copyState.checkout_cod_title_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  checkout_cod_title_en: e.target.value,
                })
              }
            />
            <Input
              label="Checkout COD Box Title (AR)"
              dir="rtl"
              value={copyState.checkout_cod_title_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  checkout_cod_title_ar: e.target.value,
                })
              }
            />
            <Textarea
              label="Checkout COD Box Description (EN)"
              value={copyState.checkout_cod_desc_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  checkout_cod_desc_en: e.target.value,
                })
              }
            />
            <Textarea
              label="Checkout COD Box Description (AR)"
              dir="rtl"
              value={copyState.checkout_cod_desc_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  checkout_cod_desc_ar: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* Footer Texts */}
        <div className="space-y-4 pt-2 border-t border-[#F0F0F0]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#777777]">
            Footer Tagline, Bottom Note & Copyright
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Footer Tagline / Delivery Badge (EN)"
              value={copyState.footer_cod_badge_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  footer_cod_badge_en: e.target.value,
                })
              }
            />
            <Input
              label="Footer Tagline / Delivery Badge (AR)"
              dir="rtl"
              value={copyState.footer_cod_badge_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  footer_cod_badge_ar: e.target.value,
                })
              }
            />
            <Input
              label="Footer Bottom Right Note (EN)"
              value={copyState.footer_bottom_note_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  footer_bottom_note_en: e.target.value,
                })
              }
            />
            <Input
              label="Footer Bottom Right Note (AR)"
              dir="rtl"
              value={copyState.footer_bottom_note_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  footer_bottom_note_ar: e.target.value,
                })
              }
            />
            <Input
              label="Footer Copyright (EN, supports {year})"
              value={copyState.footer_copyright_en}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  footer_copyright_en: e.target.value,
                })
              }
            />
            <Input
              label="Footer Copyright (AR, supports {year})"
              dir="rtl"
              value={copyState.footer_copyright_ar}
              onChange={(e) =>
                setCopyState({
                  ...copyState,
                  footer_copyright_ar: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* Footer Links Manager */}
        <div className="space-y-4 pt-2 border-t border-[#F0F0F0]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#777777]">
              Footer Navigation Links
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setFooterLinks((prev) => [
                  ...prev,
                  {
                    group: "client_care",
                    label_en: "New Link",
                    label_ar: "رابط جديد",
                    href: "/shop",
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add Footer Link
            </Button>
          </div>
          <div className="space-y-3">
            {footerLinks.map((link, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border border-[#F0F0F0] p-3"
              >
                <div className="sm:col-span-3">
                  <Select
                    label="Group"
                    value={link.group}
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx].group = e.target.value as FooterLinkItem["group"];
                      setFooterLinks(next);
                    }}
                  >
                    <option value="client_care">Client Care</option>
                    <option value="house">The House</option>
                    <option value="legal">Legal</option>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Label (EN)"
                    value={link.label_en}
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx].label_en = e.target.value;
                      setFooterLinks(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    label="Label (AR)"
                    dir="rtl"
                    value={link.label_ar}
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx].label_ar = e.target.value;
                      setFooterLinks(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Path / URL"
                    dir="ltr"
                    value={link.href}
                    onChange={(e) => {
                      const next = [...footerLinks];
                      next[idx].href = e.target.value;
                      setFooterLinks(next);
                    }}
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setFooterLinks((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="h-11 px-3 border border-[#E5E5E5] hover:border-black cursor-pointer"
                    aria-label="Remove link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          loading={savingKey === "storefront_copy"}
          onClick={() =>
            saveContent("storefront_copy", {
              kind: "storefront_copy",
              storefront_copy: copyState,
              footer_links: footerLinks,
            })
          }
        >
          {tc("save")}
        </Button>
      </section>

      {/* 3. Hero Banner */}
      <section className="bg-white border border-[#E5E5E5] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            Homepage Hero Section
          </h2>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={heroState.is_active}
              onChange={(e) =>
                setHeroState({ ...heroState, is_active: e.target.checked })
              }
              className="accent-black"
            />
            Active
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Hero Title (EN)"
            value={heroState.title_en}
            onChange={(e) =>
              setHeroState({ ...heroState, title_en: e.target.value })
            }
          />
          <Input
            label="Hero Title (AR)"
            dir="rtl"
            value={heroState.title_ar}
            onChange={(e) =>
              setHeroState({ ...heroState, title_ar: e.target.value })
            }
          />
          <Input
            label="Hero Subtitle (EN)"
            value={heroState.subtitle_en}
            onChange={(e) =>
              setHeroState({ ...heroState, subtitle_en: e.target.value })
            }
          />
          <Input
            label="Hero Subtitle (AR)"
            dir="rtl"
            value={heroState.subtitle_ar}
            onChange={(e) =>
              setHeroState({ ...heroState, subtitle_ar: e.target.value })
            }
          />
          <Input
            label="CTA Label (EN)"
            value={heroState.cta_label_en}
            onChange={(e) =>
              setHeroState({ ...heroState, cta_label_en: e.target.value })
            }
          />
          <Input
            label="CTA Label (AR)"
            dir="rtl"
            value={heroState.cta_label_ar}
            onChange={(e) =>
              setHeroState({ ...heroState, cta_label_ar: e.target.value })
            }
          />
          <Input
            label="Destination URL"
            value={heroState.cta_url}
            onChange={(e) =>
              setHeroState({ ...heroState, cta_url: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Input
              label="Desktop Image URL"
              value={heroState.desktop_image_url}
              onChange={(e) =>
                setHeroState({
                  ...heroState,
                  desktop_image_url: e.target.value,
                })
              }
            />
            <MediaUploader
              folder="banners"
              label="Upload Desktop Hero"
              onUploaded={(url) =>
                setHeroState({ ...heroState, desktop_image_url: url })
              }
            />
          </div>
          <div className="space-y-2">
            <Input
              label="Mobile Image URL"
              value={heroState.mobile_image_url}
              onChange={(e) =>
                setHeroState({ ...heroState, mobile_image_url: e.target.value })
              }
            />
            <MediaUploader
              folder="banners"
              label="Upload Mobile Hero"
              onUploaded={(url) =>
                setHeroState({ ...heroState, mobile_image_url: url })
              }
            />
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={savingKey === "hero"}
          onClick={() =>
            saveContent("hero", { kind: "banner", ...heroState })
          }
        >
          {tc("save")}
        </Button>
      </section>

      {/* 4. Promotional Campaign Banner */}
      <section className="bg-white border border-[#E5E5E5] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            Promotional Campaign Section
          </h2>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={campaignState.is_active}
              onChange={(e) =>
                setCampaignState({
                  ...campaignState,
                  is_active: e.target.checked,
                })
              }
              className="accent-black"
            />
            Active
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Title (EN)"
            value={campaignState.title_en}
            onChange={(e) =>
              setCampaignState({ ...campaignState, title_en: e.target.value })
            }
          />
          <Input
            label="Title (AR)"
            dir="rtl"
            value={campaignState.title_ar}
            onChange={(e) =>
              setCampaignState({ ...campaignState, title_ar: e.target.value })
            }
          />
          <Input
            label="Subtitle (EN)"
            value={campaignState.subtitle_en}
            onChange={(e) =>
              setCampaignState({
                ...campaignState,
                subtitle_en: e.target.value,
              })
            }
          />
          <Input
            label="Subtitle (AR)"
            dir="rtl"
            value={campaignState.subtitle_ar}
            onChange={(e) =>
              setCampaignState({
                ...campaignState,
                subtitle_ar: e.target.value,
              })
            }
          />
          <Input
            label="CTA Label (EN)"
            value={campaignState.cta_label_en}
            onChange={(e) =>
              setCampaignState({
                ...campaignState,
                cta_label_en: e.target.value,
              })
            }
          />
          <Input
            label="CTA Label (AR)"
            dir="rtl"
            value={campaignState.cta_label_ar}
            onChange={(e) =>
              setCampaignState({
                ...campaignState,
                cta_label_ar: e.target.value,
              })
            }
          />
          <Input
            label="CTA URL"
            value={campaignState.cta_url}
            onChange={(e) =>
              setCampaignState({ ...campaignState, cta_url: e.target.value })
            }
          />
          <div className="space-y-2">
            <Input
              label="Campaign Image URL"
              value={campaignState.desktop_image_url}
              onChange={(e) =>
                setCampaignState({
                  ...campaignState,
                  desktop_image_url: e.target.value,
                  mobile_image_url: e.target.value,
                })
              }
            />
            <MediaUploader
              folder="banners"
              onUploaded={(url) =>
                setCampaignState({
                  ...campaignState,
                  desktop_image_url: url,
                  mobile_image_url: url,
                })
              }
            />
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={savingKey === "campaign"}
          onClick={() =>
            saveContent("campaign", { kind: "banner", ...campaignState })
          }
        >
          {tc("save")}
        </Button>
      </section>

      {/* 5. All Homepage Sections (Headings, Subtitles & Toggles) */}
      <section className="bg-white border border-[#E5E5E5] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
            Homepage Sections (Titles, Descriptions & Visibility)
          </h2>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={sectionDraft.is_enabled}
              onChange={(e) =>
                setSectionDraft({
                  ...sectionDraft,
                  is_enabled: e.target.checked,
                })
              }
              className="accent-black"
            />
            Section Enabled
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {SECTION_KEYS.map((sk) => (
            <button
              key={sk.key}
              type="button"
              onClick={() => selectSection(sk.key)}
              className={`h-9 px-3.5 text-xs uppercase tracking-wider border cursor-pointer ${
                activeSecKey === sk.key
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-[#E5E5E5]"
              }`}
            >
              {sk.key.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Section Title (EN)"
            value={sectionDraft.title_en}
            onChange={(e) =>
              setSectionDraft({ ...sectionDraft, title_en: e.target.value })
            }
          />
          <Input
            label="Section Title (AR)"
            dir="rtl"
            value={sectionDraft.title_ar}
            onChange={(e) =>
              setSectionDraft({ ...sectionDraft, title_ar: e.target.value })
            }
          />
          <Input
            label="Subtitle / Eyebrow (EN)"
            value={sectionDraft.subtitle_en}
            onChange={(e) =>
              setSectionDraft({ ...sectionDraft, subtitle_en: e.target.value })
            }
          />
          <Input
            label="Subtitle / Eyebrow (AR)"
            dir="rtl"
            value={sectionDraft.subtitle_ar}
            onChange={(e) =>
              setSectionDraft({ ...sectionDraft, subtitle_ar: e.target.value })
            }
          />
          {activeSecKey === "brand_identity" && (
            <>
              <Textarea
                label="Brand Philosophy Body (EN)"
                value={sectionDraft.body_en}
                onChange={(e) =>
                  setSectionDraft({ ...sectionDraft, body_en: e.target.value })
                }
              />
              <Textarea
                label="Brand Philosophy Body (AR)"
                dir="rtl"
                value={sectionDraft.body_ar}
                onChange={(e) =>
                  setSectionDraft({ ...sectionDraft, body_ar: e.target.value })
                }
              />
              <div className="sm:col-span-2 space-y-2">
                <Input
                  label="Brand Identity Image URL"
                  value={sectionDraft.image_url ?? ""}
                  onChange={(e) =>
                    setSectionDraft({
                      ...sectionDraft,
                      image_url: e.target.value,
                    })
                  }
                />
                <MediaUploader
                  folder="banners"
                  onUploaded={(url) =>
                    setSectionDraft({ ...sectionDraft, image_url: url })
                  }
                />
              </div>
            </>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={savingKey === "section"}
          onClick={() =>
            saveContent("section", { kind: "section", ...sectionDraft })
          }
        >
          {tc("save")}
        </Button>
      </section>

      {/* 6. Content Pages (About, Contact, Policies) */}
      <section className="bg-white border border-[#E5E5E5] p-6 space-y-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
          Editorial & Policy Pages
        </h2>
        <div className="flex flex-wrap gap-2">
          {["about", "contact", "shipping", "returns", "privacy", "terms"].map(
            (slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => selectPage(slug)}
                className={`h-9 px-3.5 text-xs uppercase tracking-wider border cursor-pointer ${
                  activePageSlug === slug
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-[#E5E5E5]"
                }`}
              >
                {slug}
              </button>
            ),
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Page Title (EN)"
            value={pageDraft.title_en}
            onChange={(e) =>
              setPageDraft({ ...pageDraft, title_en: e.target.value })
            }
          />
          <Input
            label="Page Title (AR)"
            dir="rtl"
            value={pageDraft.title_ar}
            onChange={(e) =>
              setPageDraft({ ...pageDraft, title_ar: e.target.value })
            }
          />
          <Textarea
            label="Content (EN)"
            value={pageDraft.body_en}
            onChange={(e) =>
              setPageDraft({ ...pageDraft, body_en: e.target.value })
            }
          />
          <Textarea
            label="Content (AR)"
            dir="rtl"
            value={pageDraft.body_ar}
            onChange={(e) =>
              setPageDraft({ ...pageDraft, body_ar: e.target.value })
            }
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          loading={savingKey === "page"}
          onClick={() => saveContent("page", { kind: "page", ...pageDraft })}
        >
          {tc("save")}
        </Button>
      </section>
    </div>
  );
}
