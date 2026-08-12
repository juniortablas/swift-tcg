/**
 * Wishlist persistence — Shopify customer metafield (single source of truth).
 *
 * Definition is created by `npm run setup:wishlist`. Customer Account API
 * access must be "Read and write" (Admin → Custom data → Customers, or the
 * setup script notes when manual enablement is required for merchant-owned defs).
 */

export const WISHLIST_NAMESPACE = "swift"
export const WISHLIST_KEY = "wishlist"
export const WISHLIST_METAFIELD_TYPE = "list.product_reference"

/** Soft cap to keep metafield payloads and Storefront hydrations bounded. */
export const WISHLIST_MAX_ITEMS = 100

export const WISHLIST_PENDING_STORAGE_KEY = "swift-tcg-wishlist-pending"

export function isProductGid(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/Product/")
}

/**
 * Parse a `list.product_reference` (or legacy JSON array) metafield value into
 * unique product GIDs, preserving order.
 */
export function parseWishlistProductIds(value: string | null | undefined): string[] {
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
      if (ids.length >= WISHLIST_MAX_ITEMS) break
    }
    return ids
  } catch {
    return []
  }
}

/** Serialize product GIDs for `list.product_reference` metafield writes. */
export function serializeWishlistProductIds(ids: string[]): string {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of ids) {
    if (!isProductGid(id) || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
    if (unique.length >= WISHLIST_MAX_ITEMS) break
  }
  return JSON.stringify(unique)
}
