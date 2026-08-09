export type CatalogCategory = "pokemon" | "onepiece"

export type ProductStatus = "instock" | "preorder" | "soldout" | "unknown"

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
  /** Shopify vendor — manufacturer / brand when set. */
  vendor?: string | null
  /** Shopify tags — used for language facets and status. */
  tags?: string[]
  /** ISO date (YYYY-MM-DD) from Shopify `custom.release_date` when set. */
  releaseDate?: string | null
}
