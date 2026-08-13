/**
 * Shopify product search for the global SearchDialog (fallback path).
 *
 * Matches against title, handle, vendor, product type, tags, and SKU.
 */

import type { Product } from "@/types/product"

import { catalogFetchOptions } from "./cache"
import { shopifyFetch } from "./client"
import { mapShopifyProduct, mapShopifyProducts } from "./mappers"
import { applyWeeklyRestockLimits } from "./weeklyRestockAvailability"
import { GET_PRODUCT_CARD_BY_HANDLE, GET_PRODUCTS } from "./queries"
import type {
  Product as ShopifyProduct,
  ProductByHandleQueryResult,
  ProductsQueryResult,
} from "./types"

/** Strip characters that break Shopify search query syntax. */
function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[\\:*()[\]{}'"]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

/**
 * Storefront `products(query:)` supports title, vendor, product_type, tag, sku.
 * Handle is matched locally (and via exact handle lookup).
 */
function buildShopifySearchQuery(term: string): string {
  const escaped = sanitizeSearchTerm(term)
  if (!escaped) return ""

  return [
    `title:${escaped}*`,
    `vendor:${escaped}*`,
    `product_type:${escaped}*`,
    `tag:${escaped}*`,
    `sku:${escaped}*`,
    escaped,
  ].join(" OR ")
}

function matchesShopifyProduct(
  product: ShopifyProduct,
  query: string
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false

  const fields = [
    product.title,
    product.handle,
    product.vendor,
    product.productType,
    ...product.tags,
  ]

  return fields.some((value) => value?.toLowerCase().includes(q))
}

/**
 * Search published Shopify products.
 * Returns mapped app `Product` records (max `limit`).
 */
export async function searchShopifyProducts(
  query: string,
  limit = 12
): Promise<Product[]> {
  const term = query.trim()
  if (!term) return []

  const shopifyQuery = buildShopifySearchQuery(term)
  if (!shopifyQuery) return []

  const handleCandidate = term.toLowerCase().replace(/\s+/g, "-")
  const fetchSize = Math.min(Math.max(limit * 2, 16), 40)

  const [listData, handleData] = await Promise.all([
    shopifyFetch<ProductsQueryResult>({
      query: GET_PRODUCTS,
      variables: {
        first: fetchSize,
        query: shopifyQuery,
      },
      ...catalogFetchOptions,
    }),
    shopifyFetch<ProductByHandleQueryResult>({
      query: GET_PRODUCT_CARD_BY_HANDLE,
      variables: { handle: handleCandidate },
      ...catalogFetchOptions,
    }),
  ])

  const byId = new Map<string, ShopifyProduct>()

  for (const edge of listData.products.edges) {
    const product = edge.node
    if (matchesShopifyProduct(product, term)) {
      byId.set(product.id, product)
    }
  }

  if (handleData.product) {
    byId.set(handleData.product.id, handleData.product)
  } else {
    for (const edge of listData.products.edges) {
      if (edge.node.handle.toLowerCase().includes(term.toLowerCase())) {
        byId.set(edge.node.id, edge.node)
      }
    }
  }

  const matched = Array.from(byId.values())
  if (matched.length === 0) return []

  if (handleData.product && byId.has(handleData.product.id)) {
    const exact = handleData.product
    const rest = matched.filter((product) => product.id !== exact.id)
    return applyWeeklyRestockLimits(
      [mapShopifyProduct(exact), ...mapShopifyProducts(rest)].slice(0, limit)
    )
  }

  return applyWeeklyRestockLimits(mapShopifyProducts(matched).slice(0, limit))
}
