/**
 * Shopify product loaders.
 *
 * Maps Storefront products into the app `Product` model.
 * Collection pages pass a `collectionHandle` (e.g. `one-piece`, `pokemon`).
 */

import type { CatalogCategory, Product } from "@/types/product"

import { shopifyFetch } from "./client"
import { mapShopifyProduct, mapShopifyProducts } from "./mappers"
import {
  GET_COLLECTION_PRODUCTS,
  GET_PRODUCT_BY_HANDLE,
  GET_PRODUCT_COLLECTIONS,
  GET_PRODUCTS,
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
 * Fetch published products from the Shopify Storefront API
 * and map them into the app `Product` interface.
 */
export async function getShopifyProducts(
  options: GetShopifyProductsOptions = {}
): Promise<Product[]> {
  const nodes = options.collectionHandle
    ? await fetchAllCollectionProducts(options.collectionHandle)
    : await fetchAllCatalogProducts({ query: options.query })

  const products = mapShopifyProducts(nodes, { category: options.category })

  console.log(
    options.collectionHandle
      ? `Fetched ${products.length} Shopify products from collection "${options.collectionHandle}".`
      : `Fetched ${products.length} Shopify products.`
  )

  return products
}

/**
 * Fetch a single published product by handle (slug).
 * Returns `null` when Shopify has no matching product.
 */
export async function getShopifyProductByHandle(
  handle: string
): Promise<Product | null> {
  const data = await shopifyFetch<ProductByHandleQueryResult>({
    query: GET_PRODUCT_BY_HANDLE,
    variables: { handle },
  })

  if (!data.product) return null

  return mapShopifyProduct(data.product)
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
 * Prefers collections the product already belongs to, then category/tags.
 */
async function resolveRelatedCollectionHandle(
  handle: string,
  category?: CatalogCategory
): Promise<string | null> {
  const data = await shopifyFetch<ProductCollectionsQueryResult>({
    query: GET_PRODUCT_COLLECTIONS,
    variables: { handle },
  })

  const product = data.product
  if (!product) return categoryToCollectionHandle(category)

  const memberHandles = product.collections.edges.map((edge) => edge.node.handle)

  for (const key of PRIMARY_COLLECTION_KEYS) {
    const belongsToPrimary = memberHandles.some((memberHandle) =>
      matchesCollectionHandle(memberHandle, key)
    )
    if (belongsToPrimary) {
      return getStandardCollection(key)?.handle ?? key
    }
  }

  return (
    inferCollectionHandleFromProduct(product) ??
    categoryToCollectionHandle(category)
  )
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
  })

  const nodes = data.collection?.products.edges.map((edge) => edge.node) ?? []
  const categoryHint =
    collectionHandle === "one-piece" ? "One Piece TCG" : "Pokémon TCG"

  return mapShopifyProducts(nodes, { category: categoryHint })
    .filter((product) => product.slug !== options.handle)
    .slice(0, limit)
}
