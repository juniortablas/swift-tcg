/**
 * Back in Stock persistence — Shopify metafields (single source of truth).
 *
 * Definitions are created by `npm run setup:back-in-stock`.
 *
 * Dual index for scale:
 * - Customer `swift.back_in_stock` — account UI + unsubscribe (includes dates)
 * - Product `swift.bis_subscribers` — reverse lookup when inventory returns
 * - Shop `swift.bis_watched_products` — cron only checks products with subscribers
 */

export const BIS_NAMESPACE = "swift"

/** Customer JSON: `[{ productId, subscribedAt }]` */
export const BIS_CUSTOMER_KEY = "back_in_stock"
export const BIS_CUSTOMER_METAFIELD_TYPE = "json"

/** Product JSON: `[{ customerId, subscribedAt }]` */
export const BIS_PRODUCT_KEY = "bis_subscribers"
export const BIS_PRODUCT_METAFIELD_TYPE = "json"

/** Shop JSON: unique product GIDs with at least one active subscriber */
export const BIS_SHOP_KEY = "bis_watched_products"
export const BIS_SHOP_METAFIELD_TYPE = "json"

/** Soft cap per customer to keep metafield payloads bounded. */
export const BIS_MAX_SUBSCRIPTIONS = 50

export const BIS_PENDING_STORAGE_KEY = "swift-tcg-bis-pending"

export function isProductGid(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/Product/")
}

export function isCustomerGid(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/Customer/")
}

export type BisSubscription = {
  productId: string
  subscribedAt: string
}

export type BisProductSubscriber = {
  customerId: string
  subscribedAt: string
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && !Number.isNaN(Date.parse(value))
}

/**
 * Parse customer back-in-stock JSON into unique subscriptions (newest first).
 */
export function parseCustomerSubscriptions(
  value: string | null | undefined
): BisSubscription[] {
  if (!value?.trim()) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    const items: BisSubscription[] = []

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue
      const record = entry as Record<string, unknown>
      const productId = record.productId
      const subscribedAt = record.subscribedAt
      if (!isProductGid(productId) || seen.has(productId)) continue
      seen.add(productId)
      items.push({
        productId,
        subscribedAt: isIsoDate(subscribedAt)
          ? new Date(subscribedAt).toISOString()
          : new Date().toISOString(),
      })
      if (items.length >= BIS_MAX_SUBSCRIPTIONS) break
    }

    return items
  } catch {
    return []
  }
}

export function serializeCustomerSubscriptions(
  items: BisSubscription[]
): string {
  const seen = new Set<string>()
  const unique: BisSubscription[] = []

  for (const item of items) {
    if (!isProductGid(item.productId) || seen.has(item.productId)) continue
    seen.add(item.productId)
    unique.push({
      productId: item.productId,
      subscribedAt: isIsoDate(item.subscribedAt)
        ? new Date(item.subscribedAt).toISOString()
        : new Date().toISOString(),
    })
    if (unique.length >= BIS_MAX_SUBSCRIPTIONS) break
  }

  return JSON.stringify(unique)
}

export function parseProductSubscribers(
  value: string | null | undefined
): BisProductSubscriber[] {
  if (!value?.trim()) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    const items: BisProductSubscriber[] = []

    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue
      const record = entry as Record<string, unknown>
      const customerId = record.customerId
      const subscribedAt = record.subscribedAt
      if (!isCustomerGid(customerId) || seen.has(customerId)) continue
      seen.add(customerId)
      items.push({
        customerId,
        subscribedAt: isIsoDate(subscribedAt)
          ? new Date(subscribedAt).toISOString()
          : new Date().toISOString(),
      })
    }

    return items
  } catch {
    return []
  }
}

export function serializeProductSubscribers(
  items: BisProductSubscriber[]
): string {
  const seen = new Set<string>()
  const unique: BisProductSubscriber[] = []

  for (const item of items) {
    if (!isCustomerGid(item.customerId) || seen.has(item.customerId)) continue
    seen.add(item.customerId)
    unique.push({
      customerId: item.customerId,
      subscribedAt: isIsoDate(item.subscribedAt)
        ? new Date(item.subscribedAt).toISOString()
        : new Date().toISOString(),
    })
  }

  return JSON.stringify(unique)
}

export function parseWatchedProductIds(
  value: string | null | undefined
): string[] {
  if (!value?.trim()) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    const seen = new Set<string>()
    const ids: string[] = []
    for (const entry of parsed) {
      if (!isProductGid(entry) || seen.has(entry)) continue
      seen.add(entry)
      ids.push(entry)
    }
    return ids
  } catch {
    return []
  }
}

export function serializeWatchedProductIds(ids: string[]): string {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of ids) {
    if (!isProductGid(id) || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  return JSON.stringify(unique)
}

export function customerSubscriptionProductIds(
  items: BisSubscription[]
): string[] {
  return items.map((item) => item.productId)
}
