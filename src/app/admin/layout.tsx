import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  Cormorant_Garamond,
  IBM_Plex_Sans_Arabic,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { getAdminLocale } from "@/lib/auth/admin-locale";
import { ToastProvider } from "@/components/ui/Toast";
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

export const metadata: Metadata = {
  title: "ALVERO — Administration",
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getAdminLocale();
  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${serifEditorial.variable} ${sansLatin.variable} ${sansArabic.variable}`}
    >
      <body className="min-h-screen bg-[#FAFAFA] text-black antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
