import type { Metadata } from "next";
import { getContentPage } from "@/lib/data/storefront";
import type { Locale } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getContentPage("about");
  const isAr = locale === "ar";
  return {
    title: page ? (isAr ? page.title_ar : page.title_en) : isAr ? "عن ألفيرو" : "About ALVERO",
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "ar" ? "ar" : "en";
  const page = await getContentPage("about");

  const title = page
    ? locale === "ar"
      ? page.title_ar
      : page.title_en
    : locale === "ar"
      ? "عن ألفيرو"
      : "About ALVERO";

  const body = page
    ? locale === "ar"
      ? page.body_ar
      : page.body_en
    : locale === "ar"
      ? "ألفيرو هي دار أزياء فاخرة معاصرة تلتزم بالبساطة الأحادية الصارمة."
      : "ALVERO is a contemporary luxury fashion house committed to strict monochrome minimalism.";

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-8">
      <div className="pb-6 border-b border-[#E5E5E5]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#777777]">
          ALVERO
        </p>
        <h1 className="mt-3 font-serif text-3xl sm:text-5xl uppercase tracking-[0.1em]">
          {title}
        </h1>
      </div>
      <div className="text-sm sm:text-base text-[#333333] leading-loose whitespace-pre-line">
        {body}
      </div>
    </article>
  );
}
