import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/timeline", "/auth/callback"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/auth/") || pathname.startsWith("/timeline") || pathname.startsWith("/certificacion/")
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role ?? "student";

    // Redirect authenticated users away from auth pages
    if (isPublicRoute && pathname !== "/auth/callback" && !pathname.startsWith("/timeline") && !pathname.startsWith("/certificacion/")) {
      const url = request.nextUrl.clone();
      url.pathname = role === "coordinator" ? "/coordinator" : role === "expositor" ? "/expositor" : "/dashboard";
      return NextResponse.redirect(url);
    }

    // Role-based route protection
    if (pathname.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/coordinator") && role !== "coordinator" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/expositor") && role !== "expositor" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
