import { NextResponse } from "next/server"

import {
  attachCustomerToCart,
  completeCustomerLogin,
  readCartIdCookie,
} from "@/lib/shopify/customerAccount"
import { captureRouteException } from "@/lib/observability/capture"

export const dynamic = "force-dynamic"

/**
 * OAuth callback — exchange code for Customer Account tokens.
 * Must match the Callback URL in Headless → Customer Account API settings.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  try {
    const { returnTo } = await completeCustomerLogin({
      code: searchParams.get("code"),
      state: searchParams.get("state"),
      error: searchParams.get("error"),
      errorDescription: searchParams.get("error_description"),
    })

    // Preserve cart across sign-in when Shopify supports buyer identity.
    const cartId = await readCartIdCookie()
    if (cartId) {
      await attachCustomerToCart(cartId).catch(() => null)
    }

    const destination = new URL(returnTo, request.url)
    destination.searchParams.set("cart_sync", "1")
    return NextResponse.redirect(destination)
  } catch (error) {
    console.error("[account/authorize]", error)
    const oauthError = searchParams.get("error")
    if (oauthError !== "access_denied" && oauthError !== "login_required") {
      captureRouteException(error, { route: "/account/authorize", status: 500 })
    }
    const home = new URL("/", request.url)
    home.searchParams.set("account_error", "1")
    return NextResponse.redirect(home)
  }
}
