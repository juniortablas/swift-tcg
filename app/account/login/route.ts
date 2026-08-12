import { NextResponse } from "next/server"

import { beginCustomerLogin } from "@/lib/shopify/customerAccount"
import { captureRouteException } from "@/lib/observability/capture"

export const dynamic = "force-dynamic"

/**
 * Start Shopify New Customer Accounts OAuth (PKCE).
 * GET /account/login?return_to=/account
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const returnTo = searchParams.get("return_to")

  try {
    const authorizationUrl = await beginCustomerLogin({ returnTo })
    return NextResponse.redirect(authorizationUrl)
  } catch (error) {
    console.error("[account/login]", error)
    captureRouteException(error, { route: "/account/login", status: 500 })
    const url = new URL("/", request.url)
    url.searchParams.set("account_error", "1")
    return NextResponse.redirect(url)
  }
}
