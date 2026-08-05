export type CatalogCategory = "pokemon" | "onepiece"

export type ProductStatus = "instock" | "preorder" | "soldout" | "unknown"

/**
 * Storefront product record.
 *
 * Mirrors the shape produced by `scripts/import-sora.ts`.
 * Swap the catalog loaders for Shopify later without changing consumers.
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
  /** Optional UI flag — not present in catalog JSON. */
  isNew?: boolean
}
