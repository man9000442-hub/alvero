import { cookies } from "next/headers";
import type { Locale } from "@/types/database";

export async function getAdminLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const val = cookieStore.get("ALVERO_ADMIN_LOCALE")?.value;
  return val === "ar" ? "ar" : "en";
}
