import { NextResponse } from "next/server"

import { beginCustomerLogin } from "@/lib/shopify/customerAccount"
import { ShopifyClientError } from "@/lib/shopify/client"

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
    const message =
      error instanceof ShopifyClientError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to start login."
    const url = new URL("/", request.url)
    url.searchParams.set("account_error", message)
    return NextResponse.redirect(url)
  }
}
