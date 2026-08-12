import { NextResponse } from "next/server"

import { applySentryUserFromSession } from "@/lib/observability/user"
import { isCustomerLoggedIn } from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

/**
 * Lightweight session probe for client hydration.
 * Used by CustomerSessionProvider so store pages never await cookies.
 * Optional identity fields are hashed / non-secret and used only for observability.
 */
export async function GET() {
  const loggedIn = await isCustomerLoggedIn().catch(() => false)
  if (!loggedIn) {
    return NextResponse.json({
      loggedIn: false,
      customerId: null,
      emailHash: null,
    })
  }

  const user = await applySentryUserFromSession()
  return NextResponse.json({
    loggedIn: true,
    customerId: user?.id ?? null,
    emailHash: user?.emailHash ?? null,
  })
}
