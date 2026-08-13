/**
 * Shopify Predictive Search loader with product-search fallback.
 */

import type { Product } from "@/types/product"

import { catalogFetchOptions } from "./cache"
import { shopifyFetch, ShopifyClientError } from "./client"
import { mapShopifyProducts } from "./mappers"
import { applyWeeklyRestockLimits } from "./weeklyRestockAvailability"
import { PREDICTIVE_SEARCH } from "./queries"
import { RESERVED_GAME_HANDLES } from "./reservedHandles"
import { searchShopifyProducts } from "./search"
import type {
  PredictiveSearchPayload,
  PredictiveSearchQueryResult,
  SearchCollectionHit,
  SearchPageHit,
} from "./predictiveSearchTypes"
import type { Product as ShopifyProduct } from "./types"

const SEARCHABLE_FIELDS = [
  "TITLE",
  "PRODUCT_TYPE",
  "VENDOR",
  "TAG",
  "VARIANTS_SKU",
  "VARIANTS_TITLE",
  "BODY",
] as const

const SEARCH_TYPES = ["PRODUCT", "COLLECTION", "PAGE", "QUERY"] as const

const COLLECTION_STOREFRONT_PATHS: Record<string, string> = {
  "new-arrivals": "/new-releases",
  "new-releases": "/new-releases",
  preorders: "/preorders",
}

const LANGUAGE_PARENTS = ["one-piece", "pokemon"] as const

/**
 * Map Shopify collection handles onto app storefront paths.
 * Returns null when the collection has no public catalog route (avoids 404s).
 */
export function collectionHitUrl(handle: string): string | null {
  const normalized = handle.trim().replace(/^\/+/, "").toLowerCase()
  if (!normalized) return null

  const mapped = COLLECTION_STOREFRONT_PATHS[normalized]
  if (mapped) return mapped

  for (const parent of LANGUAGE_PARENTS) {
    const prefix = `${parent}-`
    if (normalized.startsWith(prefix)) {
      const slug = normalized.slice(prefix.length)
      if (slug) return `/${parent}/${slug}`
    }
  }

  if (RESERVED_GAME_HANDLES.has(normalized)) return null
  return `/${normalized}`
}

export function pageHitUrl(handle: string): string {
  const normalized = handle.trim().replace(/^\/+/, "")
  if (!normalized) return "/pages"
  return `/pages/${normalized}`
}

function mapCollections(
  collections: NonNullable<
    PredictiveSearchQueryResult["predictiveSearch"]
  >["collections"]
): SearchCollectionHit[] {
  const hits: SearchCollectionHit[] = []
  const seen = new Set<string>()
  for (const collection of collections) {
    const url = collectionHitUrl(collection.handle)
    if (!url || seen.has(url)) continue
    seen.add(url)
    hits.push({
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
      url,
      image: collection.image?.url ?? null,
    })
  }
  return hits
}

function mapPages(
  pages: NonNullable<
    PredictiveSearchQueryResult["predictiveSearch"]
  >["pages"]
): SearchPageHit[] {
  return pages.map((page) => ({
    id: page.id,
    handle: page.handle,
    title: page.title,
    url: pageHitUrl(page.handle),
  }))
}

async function predictiveSearchShopify(
  query: string,
  limit: number
): Promise<PredictiveSearchPayload | null> {
  const data = await shopifyFetch<PredictiveSearchQueryResult>({
    query: PREDICTIVE_SEARCH,
    variables: {
      query,
      limit,
      types: [...SEARCH_TYPES],
      searchableFields: [...SEARCHABLE_FIELDS],
    },
    ...catalogFetchOptions,
  })

  const result = data.predictiveSearch
  if (!result) return null

  return {
    products: await applyWeeklyRestockLimits(
      mapShopifyProducts(result.products as ShopifyProduct[])
    ),
    collections: mapCollections(result.collections),
    pages: mapPages(result.pages),
    queries: result.queries.map((item) => ({ text: item.text })),
    source: "predictive",
  }
}

async function fallbackSearch(
  query: string,
  limit: number
): Promise<PredictiveSearchPayload> {
  const products = await searchShopifyProducts(query, limit)
  return {
    products,
    collections: [],
    pages: [],
    queries: [],
    source: "fallback",
  }
}

/**
 * Run predictive search; fall back to the existing products query on failure
 * or empty predictive product hits when the query looks product-oriented.
 */
export async function runPredictiveSearch(
  query: string,
  limit = 8
): Promise<PredictiveSearchPayload> {
  const term = query.trim()
  if (!term) {
    return {
      products: [],
      collections: [],
      pages: [],
      queries: [],
      source: "predictive",
    }
  }

  const capped = Math.min(Math.max(limit, 1), 10)

  try {
    const predictive = await predictiveSearchShopify(term, capped)
    if (!predictive) {
      return fallbackSearch(term, Math.min(capped * 2, 24))
    }

    // If predictive returns nothing useful, try the broader product search.
    const empty =
      predictive.products.length === 0 &&
      predictive.collections.length === 0 &&
      predictive.pages.length === 0

    if (empty) {
      const fallback = await fallbackSearch(term, Math.min(capped * 2, 24))
      if (fallback.products.length > 0) return fallback
      return {
        ...predictive,
        queries: predictive.queries,
      }
    }

    return predictive
  } catch (error) {
    if (error instanceof ShopifyClientError) {
      console.error("Predictive search failed; using fallback.", error.message)
    } else {
      console.error("Predictive search failed; using fallback.", error)
    }
    return fallbackSearch(term, Math.min(capped * 2, 24))
  }
}

/** @deprecated Prefer `runPredictiveSearch` — kept for typed product-only callers. */
export async function searchProductsViaPredictive(
  query: string,
  limit = 12
): Promise<Product[]> {
  const result = await runPredictiveSearch(query, Math.min(limit, 10))
  if (result.products.length > 0) return result.products.slice(0, limit)
  return searchShopifyProducts(query, limit)
}
