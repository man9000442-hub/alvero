import type { Metadata } from "next";
import { getContentPage, getWebsiteSettings } from "@/lib/data/storefront";
import type { Locale } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "تواصل معنا" : "Contact ALVERO",
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "ar" ? "ar" : "en";
  const [page, settings] = await Promise.all([
    getContentPage("contact"),
    getWebsiteSettings(),
  ]);

  const title = page
    ? locale === "ar"
      ? page.title_ar
      : page.title_en
    : locale === "ar"
      ? "تواصل مع ألفيرو"
      : "Contact ALVERO";

  const body = page
    ? locale === "ar"
      ? page.body_ar
      : page.body_en
    : "";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-10">
      <div className="pb-6 border-b border-[#E5E5E5]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#777777]">
          ALVERO CONCIERGE
        </p>
        <h1 className="mt-3 font-serif text-3xl sm:text-5xl uppercase tracking-[0.1em]">
          {title}
        </h1>
      </div>

      {body && (
        <p className="text-sm sm:text-base text-[#333333] leading-loose whitespace-pre-line">
          {body}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777]">
            Phone
          </p>
          <p className="text-sm font-medium" dir="ltr">
            {settings.contact_phone}
          </p>
        </div>
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777]">
            Email
          </p>
          <p className="text-sm font-medium" dir="ltr">
            {settings.support_email}
          </p>
        </div>
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#777777]">
            WhatsApp
          </p>
          <a
            href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline underline-offset-4"
          >
            Chat Concierge
          </a>
        </div>
      </div>
    </div>
  );
}
