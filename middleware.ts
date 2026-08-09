import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account/login",
  "/account/authorize",
  "/account/logout",
])

/**
 * Soft gate for account pages using the non-httpOnly logged-in flag.
 * Real auth is still enforced server-side via the sealed Customer Account session.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

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

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = "/account/login"
  loginUrl.search = ""
  loginUrl.searchParams.set("return_to", `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/account/:path*"],
}
