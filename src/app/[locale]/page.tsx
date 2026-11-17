import React from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Banknote, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getHomepageData, getWebsiteSettings } from "@/lib/data/storefront";
import { ProductCard } from "@/components/storefront/ProductCard";
import { NewsletterBlock } from "@/components/storefront/NewsletterBlock";
import { Button } from "@/components/ui/Button";
import type { HomepageSection, Locale } from "@/types/database";

export const dynamic = "force-dynamic";

function sectionText(
  section: HomepageSection | undefined,
  locale: Locale,
  fallbackTitle: string,
  fallbackSubtitle = "",
) {
  return {
    enabled: section ? section.is_enabled : true,
    title: section
      ? (locale === "ar" ? section.title_ar : section.title_en) || fallbackTitle
      : fallbackTitle,
    subtitle: section
      ? (locale === "ar" ? section.subtitle_ar : section.subtitle_en) ||
        fallbackSubtitle
      : fallbackSubtitle,
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "ar" ? "ar" : "en";
  const t = await getTranslations("home");
  const tm = await getTranslations("maintenance");

  const [settings, homeData] = await Promise.all([
    getWebsiteSettings(),
    getHomepageData(),
  ]);

  if (settings.maintenance_mode) {
    return (
      <section className="min-h-[75vh] flex flex-col items-center justify-center px-6 text-center bg-black text-white">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#999999]">
          {tm("eyebrow")}
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-6xl tracking-[0.14em] uppercase">
          {tm("title")}
        </h1>
        <p className="mt-4 max-w-md text-sm text-[#CCCCCC]">
          {locale === "ar"
            ? settings.maintenance_message_ar
            : settings.maintenance_message_en}
        </p>
      </section>
    );
  }

  const copy = settings.storefront_copy;
  const heroBanner = homeData.banners.find((b) => b.placement === "HERO");
  const campaignBanner = homeData.banners.find((b) => b.placement === "CAMPAIGN");
  const sectionMap = new Map(
    homeData.sections.map((s) => [s.section_key, s]),
  );

  const heroEyebrow =
    (locale === "ar" ? copy.hero_eyebrow_ar : copy.hero_eyebrow_en) ||
    `${settings.brand_name} · EGYPT`;

  const heroTitle = heroBanner
    ? locale === "ar"
      ? heroBanner.title_ar
      : heroBanner.title_en
    : locale === "ar"
      ? "العمارة الأحادية"
      : "MONOCHROME ARCHITECTURE";

  const heroSubtitle = heroBanner
    ? locale === "ar"
      ? heroBanner.subtitle_ar
      : heroBanner.subtitle_en
    : locale === "ar"
      ? "أساسيات مفصّلة بدقة باللونين الأسود النقي والأبيض الصافي."
      : "Tailored essentials crafted in pure black and stark white.";

  const heroCta = heroBanner
    ? locale === "ar"
      ? heroBanner.cta_label_ar
      : heroBanner.cta_label_en
    : t("exploreCollection");

  const heroUrl = heroBanner?.cta_url || "/shop";
  const heroDesktopImg =
    heroBanner?.desktop_image_url || "/images/editorial-hero.svg";
  const heroMobileImg =
    heroBanner?.mobile_image_url || "/images/editorial-hero-mobile.svg";

  const collectionsSec = sectionText(
    sectionMap.get("featured_collections"),
    locale,
    t("featuredCollectionsTitle"),
  );
  const newArrivalsSec = sectionText(
    sectionMap.get("new_arrivals"),
    locale,
    t("newArrivalsTitle"),
  );
  const bestSellersSec = sectionText(
    sectionMap.get("best_sellers"),
    locale,
    t("bestSellersTitle"),
  );
  const featuredProductsSec = sectionText(
    sectionMap.get("featured_products"),
    locale,
    t("featuredProductsTitle"),
  );
  const brandSection = sectionMap.get("brand_identity");
  const newsletterSec = sectionText(
    sectionMap.get("newsletter"),
    locale,
    locale === "ar" ? "دخول الأرشيف الخاص" : "PRIVATE ARCHIVE ACCESS",
    locale === "ar"
      ? "احصل على معاينات مبكرة للإصدارات الموسمية."
      : "Receive early previews of seasonal drops.",
  );

  return (
    <div>
      {/* 1. Editorial Hero Section (Desktop + Mobile Images) */}
      <section className="relative bg-black text-white overflow-hidden">
        <div className="relative min-h-[78vh] sm:min-h-[84vh] flex items-end">
          <Image
            src={heroDesktopImg}
            alt={heroTitle}
            fill
            priority
            sizes="100vw"
            className="hidden md:block object-cover opacity-85"
          />
          <Image
            src={heroMobileImg}
            alt={heroTitle}
            fill
            priority
            sizes="100vw"
            className="md:hidden object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          <div className="relative z-10 max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
            <div className="max-w-2xl space-y-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#CCCCCC]">
                {heroEyebrow}
              </p>
              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal tracking-[0.06em] uppercase leading-[1.06]">
                {heroTitle}
              </h1>
              <p className="text-sm sm:text-base text-[#E5E5E5] max-w-lg leading-relaxed">
                {heroSubtitle}
              </p>
              <div className="pt-2">
                <Link href={heroUrl}>
                  <Button variant="secondary" size="lg">
                    {heroCta}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Editable Brand Value Strip (Delivery, Craft, Exchange) */}
      {copy.pillars_enabled && (
        <section className="bg-white border-b border-[#E5E5E5]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5]">
            <div className="flex items-start gap-4 pt-2 md:pt-0 md:pe-6">
              <Banknote className="h-5 w-5 stroke-[1.4] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  {(locale === "ar"
                    ? copy.pillar_1_title_ar
                    : copy.pillar_1_title_en) || t("codPromiseTitle")}
                </p>
                <p className="mt-1 text-xs text-[#777777]">
                  {(locale === "ar"
                    ? copy.pillar_1_desc_ar
                    : copy.pillar_1_desc_en) || t("codPromiseDesc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 pt-5 md:pt-0 md:px-6">
              <Sparkles className="h-5 w-5 stroke-[1.4] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  {(locale === "ar"
                    ? copy.pillar_2_title_ar
                    : copy.pillar_2_title_en) || t("craftTitle")}
                </p>
                <p className="mt-1 text-xs text-[#777777]">
                  {(locale === "ar"
                    ? copy.pillar_2_desc_ar
                    : copy.pillar_2_desc_en) || t("craftDesc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 pt-5 md:pt-0 md:ps-6">
              <RefreshCw className="h-5 w-5 stroke-[1.4] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  {(locale === "ar"
                    ? copy.pillar_3_title_ar
                    : copy.pillar_3_title_en) || t("exchangeTitle")}
                </p>
                <p className="mt-1 text-xs text-[#777777]">
                  {(locale === "ar"
                    ? copy.pillar_3_desc_ar
                    : copy.pillar_3_desc_en) || t("exchangeDesc")}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Featured Collections */}
      {collectionsSec.enabled && homeData.featuredCategories.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-20">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl uppercase tracking-[0.14em]">
                {collectionsSec.title}
              </h2>
              {collectionsSec.subtitle && (
                <p className="mt-1.5 text-xs text-[#777777]">
                  {collectionsSec.subtitle}
                </p>
              )}
            </div>
            <Link
              href="/shop"
              className="text-xs uppercase tracking-[0.16em] border-b border-black pb-1 hover:opacity-60"
            >
              {t("shopAll")}
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {homeData.featuredCategories.map((cat) => {
              const title = locale === "ar" ? cat.name_ar : cat.name_en;
              return (
                <Link
                  key={cat.id}
                  href={`/shop?category=${cat.slug}`}
                  className="group relative aspect-[3/4] bg-[#F2F2F2] border border-[#E5E5E5] overflow-hidden"
                >
                  {cat.image_url && (
                    <Image
                      src={cat.image_url}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <h3 className="text-sm font-medium uppercase tracking-[0.18em]">
                      {title}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. New Arrivals */}
      {newArrivalsSec.enabled && homeData.newArrivals.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-14 border-t border-[#E5E5E5]">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl uppercase tracking-[0.14em]">
                {newArrivalsSec.title}
              </h2>
              {newArrivalsSec.subtitle && (
                <p className="mt-1.5 text-xs text-[#777777]">
                  {newArrivalsSec.subtitle}
                </p>
              )}
            </div>
            <Link
              href="/shop?sort=newest"
              className="text-xs uppercase tracking-[0.16em] border-b border-black pb-1 hover:opacity-60"
            >
              {t("shopAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
            {homeData.newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Promotional Campaign Section */}
      {campaignBanner && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <div className="relative bg-black text-white grid grid-cols-1 lg:grid-cols-12 border border-black overflow-hidden">
            <div className="lg:col-span-6 relative min-h-[340px] sm:min-h-[460px]">
              <Image
                src={campaignBanner.desktop_image_url}
                alt={
                  locale === "ar"
                    ? campaignBanner.title_ar
                    : campaignBanner.title_en
                }
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className="lg:col-span-6 p-8 sm:p-14 lg:p-16 flex flex-col justify-center space-y-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#999999]">
                CAMPAIGN
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl uppercase tracking-[0.1em]">
                {locale === "ar"
                  ? campaignBanner.title_ar
                  : campaignBanner.title_en}
              </h2>
              <p className="text-sm text-[#CCCCCC] leading-relaxed max-w-md">
                {locale === "ar"
                  ? campaignBanner.subtitle_ar
                  : campaignBanner.subtitle_en}
              </p>
              <div className="pt-2">
                <Link href={campaignBanner.cta_url || "/shop"}>
                  <Button variant="secondary" size="md">
                    {locale === "ar"
                      ? campaignBanner.cta_label_ar
                      : campaignBanner.cta_label_en}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Best Sellers */}
      {bestSellersSec.enabled && homeData.bestSellers.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-14 border-t border-[#E5E5E5]">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl uppercase tracking-[0.14em]">
                {bestSellersSec.title}
              </h2>
              {bestSellersSec.subtitle && (
                <p className="mt-1.5 text-xs text-[#777777]">
                  {bestSellersSec.subtitle}
                </p>
              )}
            </div>
            <Link
              href="/shop?sort=best_sellers"
              className="text-xs uppercase tracking-[0.16em] border-b border-black pb-1 hover:opacity-60"
            >
              {t("shopAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
            {homeData.bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 7. Featured Products */}
      {featuredProductsSec.enabled && homeData.featuredProducts.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-14 border-t border-[#E5E5E5]">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl uppercase tracking-[0.14em]">
                {featuredProductsSec.title}
              </h2>
              {featuredProductsSec.subtitle && (
                <p className="mt-1.5 text-xs text-[#777777]">
                  {featuredProductsSec.subtitle}
                </p>
              )}
            </div>
            <Link
              href="/shop"
              className="text-xs uppercase tracking-[0.16em] border-b border-black pb-1 hover:opacity-60"
            >
              {t("shopAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6">
            {homeData.featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 8. Brand Identity Section */}
      {(!brandSection || brandSection.is_enabled) && (
        <section className="bg-white border-t border-b border-[#E5E5E5] py-20">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 relative aspect-[4/5] bg-[#F5F5F5] border border-[#E5E5E5]">
              <Image
                src={brandSection?.image_url || "/images/editorial-brand.svg"}
                alt="ALVERO Philosophy"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
            <div className="lg:col-span-7 space-y-6 lg:ps-8">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#777777]">
                {brandSection
                  ? locale === "ar"
                    ? brandSection.subtitle_ar
                    : brandSection.subtitle_en
                  : "ALVERO HOUSE PHILOSOPHY"}
              </p>
              <h2 className="font-serif text-3xl sm:text-5xl uppercase tracking-[0.08em] text-black">
                {brandSection
                  ? locale === "ar"
                    ? brandSection.title_ar
                    : brandSection.title_en
                  : locale === "ar"
                    ? "الشكل دون إفراط"
                    : "FORM WITHOUT EXCESS"}
              </h2>
              <p className="text-sm sm:text-base text-[#555555] leading-relaxed max-w-xl">
                {brandSection
                  ? locale === "ar"
                    ? brandSection.body_ar
                    : brandSection.body_en
                  : locale === "ar"
                    ? "تأسست ألفيرو على الانضباط اللوني الأحادي الصارم، لتصنع قطعاً معمارية بكميات محدودة من القطن المصري الثقيل."
                    : "Founded on strict monochrome discipline, ALVERO crafts architectural garments in small batches using heavyweight combed Egyptian cotton."}
              </p>
              <Link href="/about" className="inline-block pt-2">
                <Button variant="secondary" size="md">
                  {t("exploreCollection")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 9. Optional Newsletter (disabled unless configured by Admin) */}
      {settings.newsletter_enabled && newsletterSec.enabled && (
        <NewsletterBlock
          title={newsletterSec.title}
          subtitle={newsletterSec.subtitle}
        />
      )}
    </div>
  );
}
