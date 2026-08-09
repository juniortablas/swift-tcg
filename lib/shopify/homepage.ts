/**
 * Homepage Shopify loaders.
 *
 * Powers homepage rails from Shopify collections / catalog queries.
 */

import type { Product } from "@/types/product"

import { shopifyFetch } from "./client"
import { mapShopifyProducts } from "./mappers"
import { GET_COLLECTION_PRODUCTS, GET_PRODUCTS } from "./queries"
import type {
  CollectionProductsQueryResult,
  Product as ShopifyProduct,
  ProductsQueryResult,
} from "./types"

const PREORDERS_COLLECTION_HANDLE = "preorders"

function isPreorderTagged(product: ShopifyProduct): boolean {
  return product.tags.some((tag) => {
    const normalized = tag.toLowerCase()
    return normalized === "preorder" || normalized === "pre-order"
  })
}

async function fetchCollectionProducts(
  handle: string,
  first: number
): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<CollectionProductsQueryResult>({
    query: GET_COLLECTION_PRODUCTS,
    variables: { handle, first },
  })

  return data.collection?.products.edges.map((edge) => edge.node) ?? []
}

/**
 * Coming Soon rail — prefer the Shopify "Preorders" collection.
 * Falls back to products tagged `preorder` / `pre-order` when the
 * collection is missing or empty.
 */
export async function getShopifyComingSoonProducts(
  limit = 8
): Promise<Product[]> {
  const fromCollection = await fetchCollectionProducts(
    PREORDERS_COLLECTION_HANDLE,
    limit
  )

  if (fromCollection.length > 0) {
    return mapShopifyProducts(fromCollection).slice(0, limit)
  }

  const data = await shopifyFetch<ProductsQueryResult>({
    query: GET_PRODUCTS,
    variables: { first: Math.max(limit * 5, 25) },
  })

  const tagged = data.products.edges
    .map((edge) => edge.node)
    .filter(isPreorderTagged)

  return mapShopifyProducts(tagged).slice(0, limit)
}

/** Prefer official release date; otherwise product creation time. */
function newestArrivalsSortKey(product: ShopifyProduct): string {
  const release = product.releaseDate?.value?.trim()
  if (release) return release
  return product.createdAt
}

/**
 * Newest Arrivals rail — newest active (in-stock) Shopify products.
 *
 * Sorted by `custom.release_date` DESC, falling back to `createdAt` when the
 * metafield is empty (backward compatible until merchants populate dates).
 */
export async function getShopifyNewestArrivals(limit = 8): Promise<Product[]> {
  const data = await shopifyFetch<ProductsQueryResult>({
    query: GET_PRODUCTS,
    variables: {
      // Oversample so post-filters (instock + priced) and release-date re-sort
      // still yield `limit` items.
      first: Math.max(limit * 5, 40),
      sortKey: "CREATED_AT",
      reverse: true,
    },
  })

  const sorted = [...data.products.edges.map((edge) => edge.node)].sort(
    (a, b) => newestArrivalsSortKey(b).localeCompare(newestArrivalsSortKey(a))
  )

  return mapShopifyProducts(sorted)
    .filter(
      (product) =>
        product.status === "instock" && typeof product.price === "number"
    )
    .slice(0, limit)
}
