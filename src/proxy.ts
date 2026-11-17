import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const handleIntl = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let src/app/page.tsx resolve "/" using customer cookie or admin-configured default_language
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Independent Admin Dashboard routes (/admin and /admin/*)
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const response = NextResponse.next({ request });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      supabaseUrl &&
      supabaseAnonKey &&
      !supabaseUrl.includes("your-project-ref")
    ) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user && pathname !== "/admin/login") {
        const loginUrl = new URL("/admin/login", request.url);
        return NextResponse.redirect(loginUrl);
      }

      if (user && pathname === "/admin/login") {
        const adminHome = new URL("/admin", request.url);
        return NextResponse.redirect(adminHome);
      }
    } else if (pathname !== "/admin/login") {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }

  return handleIntl(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
