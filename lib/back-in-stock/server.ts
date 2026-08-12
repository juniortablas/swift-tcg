/**
 * Server-side back-in-stock orchestration.
 *
 * Prefer Customer Account API for the customer metafield; fall back to Admin.
 * Product reverse index + shop watched list always use Admin (required for cron).
 */

import {
  BIS_MAX_SUBSCRIPTIONS,
  customerSubscriptionProductIds,
  isProductGid,
  type BisSubscription,
} from "@/lib/back-in-stock/constants"
import { ShopifyClientError } from "@/lib/shopify/client"
import { getCustomerAccessToken } from "@/lib/shopify/customerAccount/client"
import {
  getCustomerBackInStockMetafield,
  setCustomerBackInStockMetafield,
} from "@/lib/shopify/customerAccount/backInStock"
import { getAuthenticatedCustomerId } from "@/lib/shopify/customerAccount/wishlist"
import {
  getAdminBackInStockMetafield,
  getAdminProductBisState,
  setAdminBackInStockMetafield,
  syncProductSubscriberIndex,
} from "@/lib/shopify/backInStockAdmin"

export type BisSnapshot = {
  customerId: string
  subscriptions: BisSubscription[]
}

export class BisAuthError extends Error {
  readonly code = "auth_required" as const
  constructor(message = "Sign in to manage back-in-stock alerts.") {
    super(message)
    this.name = "BisAuthError"
  }
}

export class BisValidationError extends Error {
  readonly code: "invalid" | "limit" | "already_available"
  constructor(
    code: "invalid" | "limit" | "already_available",
    message: string
  ) {
    super(message)
    this.name = "BisValidationError"
    this.code = code
  }
}

type BisSource = "customer_account" | "admin"

type BisState = {
  customerId: string
  subscriptions: BisSubscription[]
  compareDigest: string | null
  source: BisSource
}

async function readWithFallback(): Promise<BisState> {
  try {
    const state = await getCustomerBackInStockMetafield()
    return { ...state, source: "customer_account" }
  } catch (caError) {
    if (caError instanceof ShopifyClientError && caError.status === 401) {
      throw new BisAuthError()
    }

    const customerId = await getAuthenticatedCustomerId()
    try {
      const admin = await getAdminBackInStockMetafield(customerId)
      return { ...admin, source: "admin" }
    } catch {
      throw caError instanceof Error
        ? caError
        : new ShopifyClientError("Unable to load back-in-stock alerts.", 502)
    }
  }
}

async function writeWithFallback(input: {
  customerId: string
  subscriptions: BisSubscription[]
  compareDigest?: string | null
  preferAdmin?: boolean
}): Promise<{ subscriptions: BisSubscription[]; source: BisSource }> {
  if (!input.preferAdmin) {
    try {
      const state = await setCustomerBackInStockMetafield(input)
      return { subscriptions: state.subscriptions, source: "customer_account" }
    } catch (error) {
      if (error instanceof ShopifyClientError && error.status === 401) {
        throw new BisAuthError()
      }
      // Fall through to Admin.
    }
  }

  const state = await setAdminBackInStockMetafield(input)
  return { subscriptions: state.subscriptions, source: "admin" }
}

/**
 * Load the signed-in customer's back-in-stock subscriptions.
 */
export async function getBackInStockSnapshot(): Promise<BisSnapshot> {
  const token = await getCustomerAccessToken()
  if (!token) throw new BisAuthError()

  const state = await readWithFallback()
  return {
    customerId: state.customerId,
    subscriptions: state.subscriptions,
  }
}

function mutateSubscriptions(
  current: BisSubscription[],
  productId: string,
  mode: "toggle" | "add" | "remove"
): {
  next: BisSubscription[]
  added: boolean
  removed: boolean
  subscribedAt?: string
} {
  const exists = current.find((item) => item.productId === productId)

  if (mode === "add") {
    if (exists) return { next: current, added: false, removed: false }
    if (current.length >= BIS_MAX_SUBSCRIPTIONS) {
      throw new BisValidationError(
        "limit",
        `You can track up to ${BIS_MAX_SUBSCRIPTIONS} products.`
      )
    }
    const subscribedAt = new Date().toISOString()
    return {
      next: [{ productId, subscribedAt }, ...current],
      added: true,
      removed: false,
      subscribedAt,
    }
  }

  if (mode === "remove") {
    if (!exists) return { next: current, added: false, removed: false }
    return {
      next: current.filter((item) => item.productId !== productId),
      added: false,
      removed: true,
    }
  }

  if (exists) {
    return {
      next: current.filter((item) => item.productId !== productId),
      added: false,
      removed: true,
    }
  }

  if (current.length >= BIS_MAX_SUBSCRIPTIONS) {
    throw new BisValidationError(
      "limit",
      `You can track up to ${BIS_MAX_SUBSCRIPTIONS} products.`
    )
  }

  const subscribedAt = new Date().toISOString()
  return {
    next: [{ productId, subscribedAt }, ...current],
    added: true,
    removed: false,
    subscribedAt,
  }
}

export async function mutateBackInStock(input: {
  productId: string
  action: "toggle" | "add" | "remove"
}): Promise<{
  subscriptions: BisSubscription[]
  productIds: string[]
  added: boolean
  removed: boolean
}> {
  const token = await getCustomerAccessToken()
  if (!token) throw new BisAuthError()

  if (!isProductGid(input.productId)) {
    throw new BisValidationError(
      "invalid",
      "A valid Shopify product id is required."
    )
  }

  const current = await readWithFallback()
  const { next, added, removed, subscribedAt } = mutateSubscriptions(
    current.subscriptions,
    input.productId,
    input.action
  )

  if (!added && !removed) {
    return {
      subscriptions: current.subscriptions,
      productIds: customerSubscriptionProductIds(current.subscriptions),
      added,
      removed,
    }
  }

  if (added) {
    // Refuse subscribe when the product is already purchasable.
    try {
      const product = await getAdminProductBisState(input.productId)
      if (product.availableForSale) {
        throw new BisValidationError(
          "already_available",
          "This product is already available — no alert needed."
        )
      }
    } catch (error) {
      if (error instanceof BisValidationError) throw error
      // If availability check fails, still allow subscribe (inventory may be opaque).
    }
  }

  const written = await writeWithFallback({
    customerId: current.customerId,
    subscriptions: next,
    compareDigest: current.compareDigest,
    preferAdmin: current.source === "admin",
  })

  // Keep reverse index + watched list in sync (Admin only).
  try {
    await syncProductSubscriberIndex({
      customerId: current.customerId,
      productId: input.productId,
      action: added ? "add" : "remove",
      subscribedAt,
    })
  } catch (indexError) {
    // Roll back customer write if reverse index fails on subscribe.
    if (added) {
      await writeWithFallback({
        customerId: current.customerId,
        subscriptions: current.subscriptions,
        preferAdmin: true,
      }).catch(() => undefined)
    }
    throw indexError instanceof Error
      ? indexError
      : new ShopifyClientError("Unable to sync back-in-stock index.", 502)
  }

  return {
    subscriptions: written.subscriptions,
    productIds: customerSubscriptionProductIds(written.subscriptions),
    added,
    removed,
  }
}

/**
 * Remove a product subscription for a customer (used by cron after email).
 * Prefer Admin path — no customer session available in jobs.
 */
export async function adminRemoveCustomerSubscription(input: {
  customerId: string
  productId: string
}): Promise<void> {
  const state = await getAdminBackInStockMetafield(input.customerId)
  if (!state.subscriptions.some((s) => s.productId === input.productId)) {
    return
  }

  await setAdminBackInStockMetafield({
    customerId: input.customerId,
    subscriptions: state.subscriptions.filter(
      (s) => s.productId !== input.productId
    ),
    compareDigest: state.compareDigest,
  })
}
