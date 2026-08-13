export type CatalogCategory = "pokemon" | "onepiece"

export type ProductStatus =
  | "instock"
  | "preorder"
  | "weekly_restock"
  | "soldout"
  | "unknown"

/**
 * Storefront product record mapped from Shopify.
 */
export interface Product {
  id: string
  slug: string
  title: string
  category: string
  image: string
  price: number | null
  url: string
  status: ProductStatus
  /**
   * Max paid reservations while sold out (`custom.weekly_restock_limit`).
   * Present when the weekly restock metafields are set.
   */
  weeklyRestockLimit?: number | null
  /**
   * Outstanding reserved qty from `custom.current_weekly_reservations`.
   * `null` means the metafield could not be read (fail closed).
   */
  weeklyRestockReserved?: number | null
  /** Spots still available (limit minus `current_weekly_reservations`). */
  weeklyRestockRemaining?: number | null
  /** True when reservation was eligible but the limit has been reached. */
  weeklyRestockLimitReached?: boolean
  /** Shopify vendor — manufacturer / brand when set. */
  vendor?: string | null
  /** Shopify `productType` (Booster Box, Starter Deck, …). */
  productType?: string | null
  /** Shopify tags — used for language facets and status. */
  tags?: string[]
  /** ISO date (YYYY-MM-DD) from Shopify `custom.release_date` when set. */
  releaseDate?: string | null
  /** Shopify `createdAt` — fallback when sorting by release date. */
  createdAt?: string | null
  /**
   * Sanitized-ready product body HTML from Shopify Admin.
   * Present on PDP fetches (`getShopifyProductByHandle`); omitted from list queries.
   */
  descriptionHtml?: string | null
  /**
   * `custom.language` metafield when set.
   * Collection list queries include this metafield; tags remain a fallback.
   */
  language?: string | null
  /** `custom.series` metafield (Series / Set). */
  series?: string | null
  /** `custom.condition` metafield. */
  condition?: string | null
  /** `custom.rarity` metafield. */
  rarity?: string | null
  /** `custom.product_code` metafield. */
  productCode?: string | null
  /** Average approved review rating (`swift.review_rating`). */
  reviewRating?: number | null
  /** Count of approved reviews (`swift.review_count`). */
  reviewCount?: number | null
  /**
   * Star breakdown from `swift.review_breakdown`
   * (`{ "1": n, "2": n, ... "5": n }`).
   */
  reviewBreakdown?: Record<"1" | "2" | "3" | "4" | "5", number> | null
  /** Shopify SEO title when set in Admin. */
  seoTitle?: string | null
  /** Shopify SEO description when set in Admin. */
  seoDescription?: string | null
  /** Plain-text product description (Storefront `description`). */
  description?: string | null
  /** Featured image alt text from Shopify. */
  imageAlt?: string | null
  /** ISO 4217 currency for `price` (defaults to USD in SEO helpers). */
  currencyCode?: string | null
  /**
   * Shopify variant GID (`selectedOrFirstAvailableVariant`).
   * Present on PDP fetches (`getShopifyProductByHandle`); omitted from lists.
   */
  variantId?: string | null
  /**
   * Additional gallery image URLs (PDP fetches). Featured image is `image`.
   */
  images?: string[]
}
