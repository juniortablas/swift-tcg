/**
 * Site-wide maintenance / coming-soon gate.
 *
 * Enable with `MAINTENANCE_MODE=true` (no code changes required to go live —
 * set the env var to `false` or unset it and redeploy/restart).
 */

import { SENTRY_TUNNEL_ROUTE } from "@/lib/observability/config"

/** Seconds for the `Retry-After` response header while maintenance is on. */
export const MAINTENANCE_RETRY_AFTER_SECONDS = 60 * 60 * 24

export const MAINTENANCE_PATH = "/maintenance"

export function isMaintenanceMode(): boolean {
  return process.env.MAINTENANCE_MODE === "true"
}

/** Paths that must stay reachable while the storefront is gated. */
export function isMaintenanceBypassPath(pathname: string): boolean {
  if (pathname === MAINTENANCE_PATH) return true
  if (pathname.startsWith("/api/") || pathname === "/api") return true
  if (
    pathname === SENTRY_TUNNEL_ROUTE ||
    pathname.startsWith(`${SENTRY_TUNNEL_ROUTE}/`)
  ) {
    return true
  }
  if (pathname.startsWith("/account/") || pathname === "/account") return true
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true
  if (pathname === "/favicon.ico") return true
  if (pathname.startsWith("/_next/")) return true
  if (pathname.startsWith("/images/")) return true
  if (pathname.startsWith("/fonts/")) return true
  if (pathname.startsWith("/icons/")) return true
  if (pathname.startsWith("/brand/")) return true
  // Public static files (e.g. /heroes/..., /products/..., *.svg)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return true
  return false
}
