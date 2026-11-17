import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPage } from "@/lib/data/storefront";
import type { Locale } from "@/types/database";

export const dynamic = "force-dynamic";

const ALLOWED_POLICIES = new Set(["shipping", "returns", "privacy", "terms"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}): Promise<Metadata> {
  const { locale, type } = await params;
  if (!ALLOWED_POLICIES.has(type)) return { title: "Policy" };
  const page = await getContentPage(type);
  const isAr = locale === "ar";
  return {
    title: page ? (isAr ? page.title_ar : page.title_en) : type.toUpperCase(),
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}) {
  const { locale: rawLocale, type } = await params;
  if (!ALLOWED_POLICIES.has(type)) {
    notFound();
  }

  const locale: Locale = rawLocale === "ar" ? "ar" : "en";
  const page = await getContentPage(type);

  const title = page
    ? locale === "ar"
      ? page.title_ar
      : page.title_en
    : type.toUpperCase();

  const body = page
    ? locale === "ar"
      ? page.body_ar
      : page.body_en
    : "";

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-8">
      <div className="pb-6 border-b border-[#E5E5E5]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#777777]">
          ALVERO POLICY
        </p>
        <h1 className="mt-3 font-serif text-3xl sm:text-4xl uppercase tracking-[0.1em]">
          {title}
        </h1>
      </div>
      <div className="text-sm sm:text-base text-[#333333] leading-loose whitespace-pre-line">
        {body}
      </div>
    </article>
  );
}
