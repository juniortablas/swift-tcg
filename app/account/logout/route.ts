import { NextResponse } from "next/server"

import {
  beginCustomerLogout,
  readCustomerSession,
} from "@/lib/shopify/customerAccount"
import { clearCustomerSession } from "@/lib/shopify/customerAccount/session"

export const dynamic = "force-dynamic"

/**
 * Next.js <Link> prefetch hits route handlers as RSC/prefetch GETs.
 * Logging out on prefetch would wipe the session as soon as AccountNav mounts.
 */
function isPrefetchRequest(request: Request): boolean {
  const purpose =
    request.headers.get("Purpose") || request.headers.get("Sec-Purpose")
  if (purpose === "prefetch") return true
  if (request.headers.get("Next-Router-Prefetch") === "1") return true
  if (request.headers.get("next-router-prefetch") === "1") return true
  return false
}

async function logout(request: Request) {
  if (isPrefetchRequest(request)) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    })
  }

  const session = await readCustomerSession()
  if (!session?.idToken) {
    await clearCustomerSession()
    return NextResponse.redirect(new URL("/", request.url))
  }

  const logoutUrl = await beginCustomerLogout(session.idToken)
  return NextResponse.redirect(logoutUrl)
}

/** End Shopify Customer Accounts session. */
export async function GET(request: Request) {
  return logout(request)
}

export async function POST(request: Request) {
  return logout(request)
}
