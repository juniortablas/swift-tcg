/**
 * Server-side wishlist orchestration.
 *
 * Prefer Customer Account API metafields; fall back to Admin API customer
 * metafields when CA access is unavailable. Shopify remains the source of truth.
 */

import {
  isProductGid,
  WISHLIST_MAX_ITEMS,
} from "@/lib/wishlist/constants"
import { ShopifyClientError } from "@/lib/shopify/client"
import { getCustomerAccessToken } from "@/lib/shopify/customerAccount/client"
import {
  getAuthenticatedCustomerId,
  getCustomerWishlistMetafield,
  setCustomerWishlistMetafield,
} from "@/lib/shopify/customerAccount/wishlist"
import {
  getAdminWishlistMetafield,
  setAdminWishlistMetafield,
} from "@/lib/shopify/wishlistAdmin"

export type WishlistSnapshot = {
  productIds: string[]
  customerId: string
}

export class WishlistAuthError extends Error {
  readonly code = "auth_required" as const
  constructor(message = "Sign in to manage your wishlist.") {
    super(message)
    this.name = "WishlistAuthError"
  }
}

export class WishlistValidationError extends Error {
  readonly code: "invalid" | "limit"
  constructor(code: "invalid" | "limit", message: string) {
    super(message)
    this.name = "WishlistValidationError"
    this.code = code
  }
}

type WishlistSource = "customer_account" | "admin"

type WishlistState = {
  customerId: string
  productIds: string[]
  compareDigest: string | null
  source: WishlistSource
}

async function readWithFallback(): Promise<WishlistState> {
  try {
    const state = await getCustomerWishlistMetafield()
    return { ...state, source: "customer_account" }
  } catch (caError) {
    if (caError instanceof ShopifyClientError && caError.status === 401) {
      throw new WishlistAuthError()
    }

    const customerId = await getAuthenticatedCustomerId()
    try {
      const admin = await getAdminWishlistMetafield(customerId)
      return { ...admin, source: "admin" }
    } catch {
      throw caError instanceof Error
        ? caError
        : new ShopifyClientError("Unable to load wishlist.", 502)
    }
  }
}

async function writeWithFallback(input: {
  customerId: string
  productIds: string[]
  compareDigest?: string | null
  preferAdmin?: boolean
}): Promise<{ productIds: string[]; source: WishlistSource }> {
  if (!input.preferAdmin) {
    try {
      const state = await setCustomerWishlistMetafield(input)
      return { productIds: state.productIds, source: "customer_account" }
    } catch (error) {
      if (error instanceof ShopifyClientError && error.status === 401) {
        throw new WishlistAuthError()
      }
      // Fall through to Admin.
    }
  }

  const state = await setAdminWishlistMetafield(input)
  return { productIds: state.productIds, source: "admin" }
}

/**
 * Load the signed-in customer's wishlist product GIDs.
 */
export async function getWishlistSnapshot(): Promise<WishlistSnapshot> {
  const token = await getCustomerAccessToken()
  if (!token) throw new WishlistAuthError()

  const state = await readWithFallback()
  return {
    customerId: state.customerId,
    productIds: state.productIds,
  }
}

function toggleIds(
  current: string[],
  productId: string,
  mode: "toggle" | "add" | "remove"
): { next: string[]; added: boolean; removed: boolean } {
  const exists = current.includes(productId)

  if (mode === "add") {
    if (exists) return { next: current, added: false, removed: false }
    if (current.length >= WISHLIST_MAX_ITEMS) {
      throw new WishlistValidationError(
        "limit",
        `Wishlist is limited to ${WISHLIST_MAX_ITEMS} products.`
      )
    }
    return { next: [productId, ...current], added: true, removed: false }
  }

  if (mode === "remove") {
    if (!exists) return { next: current, added: false, removed: false }
    return {
      next: current.filter((id) => id !== productId),
      added: false,
      removed: true,
    }
  }

  if (exists) {
    return {
      next: current.filter((id) => id !== productId),
      added: false,
      removed: true,
    }
  }
  if (current.length >= WISHLIST_MAX_ITEMS) {
    throw new WishlistValidationError(
      "limit",
      `Wishlist is limited to ${WISHLIST_MAX_ITEMS} products.`
    )
  }
  return { next: [productId, ...current], added: true, removed: false }
}

export async function mutateWishlist(input: {
  productId: string
  action: "toggle" | "add" | "remove"
}): Promise<{ productIds: string[]; added: boolean; removed: boolean }> {
  const token = await getCustomerAccessToken()
  if (!token) throw new WishlistAuthError()

  if (!isProductGid(input.productId)) {
    throw new WishlistValidationError(
      "invalid",
      "A valid Shopify product id is required."
    )
  }

  const current = await readWithFallback()
  const { next, added, removed } = toggleIds(
    current.productIds,
    input.productId,
    input.action
  )

  if (!added && !removed) {
    return { productIds: current.productIds, added, removed }
  }

  const written = await writeWithFallback({
    customerId: current.customerId,
    productIds: next,
    compareDigest: current.compareDigest,
    preferAdmin: current.source === "admin",
  })

  return { productIds: written.productIds, added, removed }
}
