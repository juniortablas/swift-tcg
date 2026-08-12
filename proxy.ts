import { NextResponse, type NextRequest } from "next/server"

import {
  isMaintenanceBypassPath,
  isMaintenanceMode,
  MAINTENANCE_PATH,
  MAINTENANCE_RETRY_AFTER_SECONDS,
} from "@/lib/maintenance"
import { getCustomerLoginHref } from "@/lib/account/customerLogin"

const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account/login",
  "/account/authorize",
  "/account/logout",
])

function maintenanceHeaders(): Headers {
  const headers = new Headers()
  headers.set("Retry-After", String(MAINTENANCE_RETRY_AFTER_SECONDS))
  return headers
}

/**
 * Soft gate for account pages using the non-httpOnly logged-in flag.
 * Real auth is still enforced server-side via the sealed Customer Account session.
 *
 * When `MAINTENANCE_MODE=true`, storefront pages redirect to `/maintenance`
 * (503 + Retry-After). API, account, robots/sitemap, and static assets stay open.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isMaintenanceMode()) {
    if (pathname === MAINTENANCE_PATH) {
      return NextResponse.rewrite(request.nextUrl, {
        status: 503,
        headers: maintenanceHeaders(),
      })
    }

    if (!isMaintenanceBypassPath(pathname)) {
      const maintenanceUrl = request.nextUrl.clone()
      maintenanceUrl.pathname = MAINTENANCE_PATH
      maintenanceUrl.search = ""
      return NextResponse.redirect(maintenanceUrl)
    }
  } else if (pathname === MAINTENANCE_PATH) {
    const home = request.nextUrl.clone()
    home.pathname = "/"
    home.search = ""
    return NextResponse.redirect(home)
  }

  if (!pathname.startsWith("/account")) {
    return NextResponse.next()
  }

  if (PUBLIC_ACCOUNT_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  const loggedIn = request.cookies.get("swift_ca_logged_in")?.value === "1"
  if (loggedIn) {
    return NextResponse.next()
  }

  const loginUrl = new URL(
    getCustomerLoginHref(`${pathname}${search}`),
    request.url
  )
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Run on app routes + account auth.
     * Skip API, Next internals, SEO files, and known static asset prefixes.
     * File extensions are also bypassed inside `isMaintenanceBypassPath`.
     */
    "/((?!api(?:/|$)|_next/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|brand/|images/|fonts/|icons/).*)",
  ],
}
