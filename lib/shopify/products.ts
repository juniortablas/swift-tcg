/**
 * Shopify product loaders.
 *
 * Maps Storefront products into the app `Product` model.
 * Collection pages pass a `collectionHandle` (e.g. `one-piece`, `pokemon`).
 */

import type { CatalogCategory, Product } from "@/types/product"

import { cache } from "react"

import { catalogFetchOptions } from "./cache"
import { shopifyFetch } from "./client"
import { mapShopifyProduct, mapShopifyProducts } from "./mappers"
import {
  GET_COLLECTION_PRODUCTS,
  GET_PRODUCT_BY_HANDLE,
  GET_PRODUCT_COLLECTIONS,
  GET_PRODUCTS,
  GET_PRODUCTS_BY_IDS,
} from "./queries"
import {
  getStandardCollection,
  normalizeCollectionLabel,
} from "./standardCollections"
import type {
  CollectionProductsQueryResult,
  Product as ShopifyProduct,
  ProductByHandleQueryResult,
  ProductCollectionsQueryResult,
  ProductsByIdsQueryResult,
  ProductsQueryResult,
} from "./types"

const PAGE_SIZE = 100

export type GetShopifyProductsOptions = {
  /**
   * Load products from a Shopify collection by handle.
   * When omitted, fetches the global published product catalog.
   */
  collectionHandle?: string
  /** Fallback category when Shopify `productType` is empty. */
  category?: string
  /** Storefront search query (only used when `collectionHandle` is omitted). */
  query?: string
}

async function fetchAllCatalogProducts(
  options: Pick<GetShopifyProductsOptions, "query"> = {}
): Promise<ShopifyProduct[]> {
  const nodes: ShopifyProduct[] = []
  let after: string | null | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<ProductsQueryResult>({
      query: GET_PRODUCTS,
      variables: {
        first: PAGE_SIZE,
        ...(options.query ? { query: options.query } : {}),
        ...(after ? { after } : {}),
      },
      ...catalogFetchOptions,
    })

    for (const edge of data.products.edges) {
      nodes.push(edge.node)
    }

    hasNextPage = data.products.pageInfo?.hasNextPage ?? false
    after = data.products.pageInfo?.endCursor ?? undefined
  }

  return nodes
}

async function fetchAllCollectionProducts(
  handle: string
): Promise<ShopifyProduct[]> {
  const nodes: ShopifyProduct[] = []
  let after: string | null | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<CollectionProductsQueryResult>({
      query: GET_COLLECTION_PRODUCTS,
      variables: {
        handle,
        first: PAGE_SIZE,
        ...(after ? { after } : {}),
      },
      ...catalogFetchOptions,
    })

    const collection = data.collection
    if (!collection) {
      return []
    }

    for (const edge of collection.products.edges) {
      nodes.push(edge.node)
    }

    hasNextPage = collection.products.pageInfo?.hasNextPage ?? false
    after = collection.products.pageInfo?.endCursor ?? undefined
  }

  return nodes
}

/**
 * Per-request dedupe keyed by primitive args (React `cache` uses Object.is).
 */
const getShopifyProductsCached = cache(
  async (
    collectionHandle: string,
    query: string,
    category: string
  ): Promise<Product[]> => {
    const nodes = collectionHandle
      ? await fetchAllCollectionProducts(collectionHandle)
      : await fetchAllCatalogProducts({
          ...(query ? { query } : {}),
        })

    const products = mapShopifyProducts(nodes, {
      ...(category ? { category } : {}),
    })

    if (process.env.NODE_ENV === "development") {
      console.log(
        collectionHandle
          ? `Fetched ${products.length} Shopify products from collection "${collectionHandle}".`
          : `Fetched ${products.length} Shopify products.`
      )
    }

    return products
  }
)

/**
 * Fetch published products from the Shopify Storefront API
 * and map them into the app `Product` interface.
 */
export async function getShopifyProducts(
  options: GetShopifyProductsOptions = {}
): Promise<Product[]> {
  return getShopifyProductsCached(
    options.collectionHandle ?? "",
    options.query ?? "",
    options.category ?? ""
  )
}

/**
 * Fetch a single published product by handle (slug).
 * Returns `null` when Shopify has no matching product.
 * Cached per request so `generateMetadata` + page share one fetch.
 */
export const getShopifyProductByHandle = cache(
  async (handle: string): Promise<Product | null> => {
    const data = await shopifyFetch<ProductByHandleQueryResult>({
      query: GET_PRODUCT_BY_HANDLE,
      variables: { handle },
      ...catalogFetchOptions,
    })

    if (!data.product) return null

    return mapShopifyProduct(data.product)
  }
)

/**
 * Hydrate products by Shopify GIDs. Preserves input order; skips missing nodes.
 * Storefront `nodes` accepts up to 250 ids per request — chunk when needed.
 */
export async function getShopifyProductsByIds(
  ids: string[]
): Promise<Product[]> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return []

  const CHUNK = 50
  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += CHUNK) {
    chunks.push(unique.slice(i, i + CHUNK))
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      shopifyFetch<ProductsByIdsQueryResult>({
        query: GET_PRODUCTS_BY_IDS,
        variables: { ids: chunk },
        ...catalogFetchOptions,
      })
    )
  )

  const byId = new Map<string, Product>()
  for (const data of results) {
    for (const node of data.nodes) {
      if (!node?.id) continue
      byId.set(node.id, mapShopifyProduct(node))
    }
  }

  return ids
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product))
}

export type GetShopifyRelatedProductsOptions = {
  /** Current product handle (slug). */
  handle: string
  /** Catalog category hint when the product is not yet in a primary collection. */
  category?: CatalogCategory
  /** Max related products to return. */
  limit?: number
}

const PRIMARY_COLLECTION_KEYS = ["pokemon", "one-piece"] as const

function collectionHandleCandidates(key: (typeof PRIMARY_COLLECTION_KEYS)[number]) {
  const standard = getStandardCollection(key)
  if (!standard) return [key]

  return [standard.handle, ...(standard.handleAliases ?? [])]
}

function matchesCollectionHandle(
  handle: string,
  key: (typeof PRIMARY_COLLECTION_KEYS)[number]
): boolean {
  const normalized = normalizeCollectionLabel(handle)
  return collectionHandleCandidates(key).some(
    (candidate) => normalizeCollectionLabel(candidate) === normalized
  )
}

function categoryToCollectionHandle(
  category: CatalogCategory | undefined
): string | null {
  if (category === "onepiece") {
    return getStandardCollection("one-piece")?.handle ?? "one-piece"
  }
  if (category === "pokemon") {
    return getStandardCollection("pokemon")?.handle ?? "pokemon"
  }
  return null
}

function inferCollectionHandleFromProduct(product: {
  productType: string
  tags: string[]
  handle: string
}): string | null {
  const haystack = [product.productType, ...product.tags, product.handle]
    .join(" ")
    .toLowerCase()

  if (
    haystack.includes("one piece") ||
    haystack.includes("one-piece") ||
    haystack.includes("onepiece")
  ) {
    return getStandardCollection("one-piece")?.handle ?? "one-piece"
  }

  if (haystack.includes("pokemon") || haystack.includes("pokémon")) {
    return getStandardCollection("pokemon")?.handle ?? "pokemon"
  }

  return null
}

/**
 * Resolve which primary collection should supply related products.
 * Prefers category/tags first to avoid an extra Shopify round-trip when possible.
 */
async function resolveRelatedCollectionHandle(
  handle: string,
  category?: CatalogCategory
): Promise<string | null> {
  const fromCategory = categoryToCollectionHandle(category)
  if (fromCategory) return fromCategory

  const data = await shopifyFetch<ProductCollectionsQueryResult>({
    query: GET_PRODUCT_COLLECTIONS,
    variables: { handle },
    ...catalogFetchOptions,
  })

  const product = data.product
  if (!product) return null

  const memberHandles = product.collections.edges.map((edge) => edge.node.handle)

  for (const key of PRIMARY_COLLECTION_KEYS) {
    const belongsToPrimary = memberHandles.some((memberHandle) =>
      matchesCollectionHandle(memberHandle, key)
    )
    if (belongsToPrimary) {
      return getStandardCollection(key)?.handle ?? key
    }
  }

  return inferCollectionHandleFromProduct(product)
}

/**
 * Related products from the same Shopify primary collection as the product.
 * Excludes the current handle. Returns [] when Shopify has nothing usable.
 */
export async function getShopifyRelatedProducts(
  options: GetShopifyRelatedProductsOptions
): Promise<Product[]> {
  const limit = options.limit ?? 5
  const collectionHandle = await resolveRelatedCollectionHandle(
    options.handle,
    options.category
  )

  if (!collectionHandle) return []

  const data = await shopifyFetch<CollectionProductsQueryResult>({
    query: GET_COLLECTION_PRODUCTS,
    variables: {
      handle: collectionHandle,
      // Fetch a small buffer so excluding the current product still fills the rail.
      first: Math.max(limit + 1, 12),
    },
    ...catalogFetchOptions,
  })

  const nodes = data.collection?.products.edges.map((edge) => edge.node) ?? []
  const categoryHint =
    collectionHandle === "one-piece" ? "One Piece TCG" : "Pokémon TCG"

  return mapShopifyProducts(nodes, { category: categoryHint })
    .filter((product) => product.slug !== options.handle)
    .slice(0, limit)
}
