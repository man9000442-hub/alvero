import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import {
  Cormorant_Garamond,
  IBM_Plex_Sans_Arabic,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { routing } from "@/i18n/routing";
import { getActiveCategories, getWebsiteSettings } from "@/lib/data/storefront";
import { ToastProvider } from "@/components/ui/Toast";
import { CartProvider } from "@/components/storefront/CartProvider";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import type { Locale } from "@/types/database";
import "../globals.css";

const serifEditorial = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif-editorial",
});

const sansLatin = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-latin",
});

const sansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-arabic",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alvero.eg";
  const settings = await getWebsiteSettings();
  const isAr = locale === "ar";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: isAr
        ? `${settings.brand_name} — أزياء فاخرة أحادية اللون`
        : `${settings.brand_name} — Monochrome Luxury Fashion`,
      template: `%s | ${settings.brand_name}`,
    },
    description: isAr
      ? "دار أزياء ألفيرو — تصاميم معمارية أحادية اللون بالقطن المصري الثقيل مع الدفع عند الاستلام في جميع محافظات مصر."
      : "ALVERO luxury monochrome fashion house. Architectural silhouettes crafted in heavyweight Egyptian textiles. Cash on Delivery across Egypt.",
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        ar: "/ar",
      },
    },
    openGraph: {
      type: "website",
      locale: isAr ? "ar_EG" : "en_US",
      siteName: settings.brand_name,
    },
  };
}

export default async function StorefrontLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [messages, settings, categories] = await Promise.all([
    getMessages(),
    getWebsiteSettings(),
    getActiveCategories(),
  ]);

  const typedLocale = locale as Locale;
  const dir = typedLocale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={typedLocale}
      dir={dir}
      className={`${serifEditorial.variable} ${sansLatin.variable} ${sansArabic.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-[#FAFAFA] text-black antialiased">
        <NextIntlClientProvider locale={typedLocale} messages={messages}>
          <ToastProvider>
            <CartProvider locale={typedLocale}>
              <Header settings={settings} categories={categories} />
              <main className="flex-1">{children}</main>
              <Footer settings={settings} />
              <CartDrawer copy={settings.storefront_copy} />
            </CartProvider>
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
