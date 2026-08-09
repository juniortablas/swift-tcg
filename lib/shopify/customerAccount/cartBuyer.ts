/**
 * Attach Shopify Customer Account access token to a Storefront cart
 * so checkout preserves buyer identity across sign-in.
 * @see https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/checkout-authentication
 */

import { shopifyFetch } from "../client"
import { CART_FIELDS } from "../cartFields"
import { mapShopifyCart, type CartFetchOptions, type CartPayload } from "../cart"
import type { CartBuyerIdentityUpdateResult } from "../types"
import { getCustomerAccessToken } from "./client"

export const CART_BUYER_IDENTITY_UPDATE = `
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
  ) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ${CART_FIELDS}
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

/**
 * Associate the logged-in customer with an existing cart.
 * No-ops (returns null) when there is no session or cart id.
 */
export async function attachCustomerToCart(
  cartId: string | null | undefined,
  options?: CartFetchOptions
): Promise<CartPayload | null> {
  const id = cartId?.trim()
  if (!id) return null

  const accessToken = await getCustomerAccessToken()
  if (!accessToken) return null

  const data = await shopifyFetch<CartBuyerIdentityUpdateResult>({
    query: CART_BUYER_IDENTITY_UPDATE,
    variables: {
      cartId: id,
      buyerIdentity: { customerAccessToken: accessToken },
    },
    buyerIp: options?.buyerIp,
    cache: "no-store",
  })

  const payload = data.cartBuyerIdentityUpdate
  if (payload.userErrors?.length) {
    // Cart may be expired — caller can ignore and keep guest cart.
    return null
  }

  return mapShopifyCart(payload.cart)
}

/** Append Shopify SSO silent auth for logged-in checkout when a session exists. */
export function withSilentCheckoutSso(
  checkoutUrl: string | null | undefined,
  loggedIn: boolean
): string | null {
  if (!checkoutUrl) return null
  if (!loggedIn) return checkoutUrl
  try {
    const url = new URL(checkoutUrl)
    if (!url.searchParams.has("sso")) {
      url.searchParams.set("sso", "silent")
    }
    return url.toString()
  } catch {
    const join = checkoutUrl.includes("?") ? "&" : "?"
    return `${checkoutUrl}${join}sso=silent`
  }
}
