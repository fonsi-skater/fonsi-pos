import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and enforces
 * route-level access:
 *  - Unauthenticated users are redirected away from protected routes.
 *  - Authenticated users are redirected away from /login and /register.
 *
 * PROTECTED-BY-DEFAULT: everything is protected except an explicit allow
 * list of public paths. This used to be inverted — a hand-maintained
 * list of protected prefixes — and it had silently gone stale: it never
 * covered half of (dashboard)'s own routes (sales, customers, branches,
 * and others added since) or any of (super-admin)'s routes at all, so
 * they were reachable by anyone, logged in or not, until this fix.
 * Flipping the default closes that whole class of bug going forward —
 * a new route is protected automatically unless someone deliberately
 * adds it here.
 *
 * Fine-grained role/permission checks (RBAC) happen deeper in the app
 * (layouts/server actions) — this middleware only handles "logged in
 * or not". See src/lib/permissions for role-based checks.
 */
export async function updateSession(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/register");

  // Public by design: the marketing home page, the auth pages
  // themselves, the embeddable POS (authorized by its own capability
  // token, not a session — see src/server/services/embed-auth.ts), and
  // every API route (webhooks and token/session-authorized endpoints
  // handle their own auth internally; redirecting them to an HTML
  // /login page would break JSON/PDF/binary responses for callers that
  // never expect a redirect, e.g. Daraja's webhook or an embed page
  // polling payment status).
  const isPublicRoute =
    path === "/" ||
    isAuthRoute ||
    path.startsWith("/embed") ||
    path.startsWith("/api");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
