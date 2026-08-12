/**
 * Product reviews — Shopify metaobjects + denormalized product metafields.
 *
 * Schema is created by `npm run setup:reviews`. Reviews are moderated
 * (pending → approved | rejected). Storefront cards read aggregate
 * metafields; full review bodies are loaded via Admin API (pending never
 * exposed publicly).
 */

/**
 * Shopify reserves the type name `product_review` for system use.
 * Use a merchant-owned type under the Swift namespace prefix.
 */
export const REVIEW_METAOBJECT_TYPE = "swift_product_review"

export const REVIEW_FIELD = {
  product: "product",
  productId: "product_id",
  customer: "customer",
  customerId: "customer_id",
  order: "order",
  rating: "rating",
  title: "title",
  body: "body",
  images: "images",
  verifiedPurchase: "verified_purchase",
  helpfulCount: "helpful_count",
  status: "status",
  nickname: "nickname",
  reviewedAt: "reviewed_at",
} as const

export const REVIEW_STATUS = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const

export type ReviewStatus =
  (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS]

export const REVIEW_NAMESPACE = "swift"
export const REVIEW_RATING_KEY = "review_rating"
export const REVIEW_COUNT_KEY = "review_count"
export const REVIEW_BREAKDOWN_KEY = "review_breakdown"

export const REVIEW_RATING_METAFIELD_TYPE = "number_decimal"
export const REVIEW_COUNT_METAFIELD_TYPE = "number_integer"
export const REVIEW_BREAKDOWN_METAFIELD_TYPE = "json"

/** Customer-owned list of review metaobject GIDs marked helpful (dedupe). */
export const REVIEW_HELPFUL_VOTES_KEY = "review_helpful_votes"
export const REVIEW_HELPFUL_VOTES_METAFIELD_TYPE = "json"

export const REVIEW_PENDING_STORAGE_KEY = "swift-tcg-review-pending"
/** Query param appended after login to auto-open the write-review modal. */
export const REVIEW_OPEN_QUERY_PARAM = "write-review"

export const REVIEW_PAGE_SIZE = 5
export const REVIEW_MAX_FETCH = 100
export const REVIEW_MAX_IMAGES = 4
export const REVIEW_MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const REVIEW_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

export const REVIEW_BODY_MIN = 10
export const REVIEW_BODY_MAX = 2000
export const REVIEW_TITLE_MAX = 120
export const REVIEW_NICKNAME_MAX = 40

export function isProductGid(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/Product/")
}

export function isCustomerGid(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/Customer/")
}

export function isMetaobjectGid(value: unknown): value is string {
  return (
    typeof value === "string" && value.startsWith("gid://shopify/Metaobject/")
  )
}

export function isOrderGid(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/Order/")
}

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return (
    value === REVIEW_STATUS.pending ||
    value === REVIEW_STATUS.approved ||
    value === REVIEW_STATUS.rejected
  )
}

export function clampRating(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN
  if (!Number.isFinite(n) || n < 1 || n > 5) return null
  return Math.round(n)
}

export function parseHelpfulVotes(value: string | null | undefined): string[] {
  if (!value?.trim()) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const ids: string[] = []
    for (const entry of parsed) {
      if (!isMetaobjectGid(entry) || seen.has(entry)) continue
      seen.add(entry)
      ids.push(entry)
    }
    return ids
  } catch {
    return []
  }
}

export function serializeHelpfulVotes(ids: string[]): string {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const id of ids) {
    if (!isMetaobjectGid(id) || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  return JSON.stringify(unique)
}

export type ReviewBreakdown = Record<"1" | "2" | "3" | "4" | "5", number>

export function emptyBreakdown(): ReviewBreakdown {
  return { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }
}

export function parseBreakdown(
  value: string | null | undefined
): ReviewBreakdown {
  const base = emptyBreakdown()
  if (!value?.trim()) return base
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object") return base
    const record = parsed as Record<string, unknown>
    for (const key of ["1", "2", "3", "4", "5"] as const) {
      const n = Number(record[key] ?? 0)
      base[key] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
    }
    return base
  } catch {
    return base
  }
}

export function computeAverage(
  breakdown: ReviewBreakdown
): { average: number; count: number } {
  let total = 0
  let count = 0
  for (const key of ["1", "2", "3", "4", "5"] as const) {
    const n = breakdown[key]
    count += n
    total += n * Number(key)
  }
  if (count === 0) return { average: 0, count: 0 }
  return {
    average: Math.round((total / count) * 10) / 10,
    count,
  }
}
