import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getWebsiteSettings } from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

export default async function RootIndexPage() {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("NEXT_LOCALE")?.value;

  if (savedLocale === "en" || savedLocale === "ar") {
    redirect(`/${savedLocale}`);
  }

  const settings = await getWebsiteSettings();
  const targetLocale = settings.default_language === "ar" ? "ar" : "en";
  redirect(`/${targetLocale}`);
}
