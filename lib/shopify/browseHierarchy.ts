/**
 * Hierarchical collection browsing helpers.
 *
 * Discovers TCG games and language facets from Shopify collection handles —
 * no hardcoded game or language names.
 *
 * Conventions:
 *   Primary TCG: any non-reserved collection with `{handle}-*` children
 *   Language:    child collection `{game}-{language}`
 */

import {
  enrichLanguageFacets,
  getShopifyCollectionLanguageFacets,
  productMatchesLanguageFacet,
  type CollectionLanguageFacet,
} from "./collectionFacets"
import { shopifyFetch } from "./client"
import { GET_COLLECTION_PRODUCTS, GET_COLLECTIONS } from "./queries"
import { RESERVED_GAME_HANDLES } from "./reservedHandles"
import type { Collection, CollectionsQueryResult } from "./types"
import type { Product } from "@/types/product"

/** Shared shape for TCG and language navigation cards. */
export type BrowseFacet = CollectionLanguageFacet

export type PrimaryTcgCollection = {
  handle: string
  title: string
  imageUrl: string | null
  imageAlt: string | null
}

function humanizeHandle(handle: string): string {
  return handle
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function fetchAllCollections(): Promise<Collection[]> {
  const nodes: Collection[] = []
  let after: string | null | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<CollectionsQueryResult>({
      query: GET_COLLECTIONS,
      variables: {
        first: 50,
        ...(after ? { after } : {}),
      },
    })

    for (const edge of data.collections.edges) {
      nodes.push(edge.node)
    }

    hasNextPage = data.collections.pageInfo?.hasNextPage ?? false
    after = data.collections.pageInfo?.endCursor ?? undefined
  }

  return nodes
}

async function resolveCollectionImage(
  handle: string,
  collectionImage: Collection["image"]
): Promise<{ url: string | null; alt: string | null }> {
  if (collectionImage?.url) {
    return {
      url: collectionImage.url,
      alt: collectionImage.altText,
    }
  }

  try {
    const data = await shopifyFetch<{
      collection: {
        products: {
          edges: Array<{
            node: {
              title: string
              featuredImage: { url: string; altText: string | null } | null
            }
          }>
        }
      } | null
    }>({
      query: GET_COLLECTION_PRODUCTS,
      variables: { handle, first: 1 },
    })
    const product = data.collection?.products.edges[0]?.node
    const image = product?.featuredImage
    if (image?.url) {
      return {
        url: image.url,
        alt: image.altText ?? product?.title ?? null,
      }
    }
  } catch {
    // Best-effort image only.
  }

  return { url: null, alt: null }
}

/**
 * Whether a product belongs to a primary TCG collection handle.
 * Prefers Shopify tags matching the handle; falls back to category/title.
 */
export function productMatchesGame(
  product: {
    title: string
    slug: string
    category?: string
    tags?: string[]
  },
  gameHandle: string
): boolean {
  const handle = gameHandle.trim().toLowerCase()
  if (!handle) return false

  const spaced = handle.replace(/-/g, " ")
  const compact = handle.replace(/-/g, "")
  const tags = (product.tags ?? []).map((tag) => tag.toLowerCase())

  if (
    tags.includes(handle) ||
    tags.includes(spaced) ||
    tags.includes(compact)
  ) {
    return true
  }

  const category = (product.category ?? "").toLowerCase()
  if (
    category.includes(spaced) ||
    category.includes(handle) ||
    category.includes(compact)
  ) {
    return true
  }

  const haystack = `${product.title} ${product.slug}`.toLowerCase()
  return (
    new RegExp(`\\b${escapeRegExp(handle)}\\b`).test(haystack) ||
    new RegExp(`\\b${escapeRegExp(spaced)}\\b`).test(haystack) ||
    new RegExp(`\\b${escapeRegExp(compact)}\\b`).test(haystack)
  )
}

/**
 * Discover primary TCG collections from Shopify.
 * A primary TCG is a non-reserved collection that has at least one
 * `{handle}-*` child collection (language facet).
 */
export async function discoverPrimaryTcgCollections(): Promise<
  PrimaryTcgCollection[]
> {
  const collections = await fetchAllCollections()
  const byHandle = new Map(
    collections.map((collection) => [
      collection.handle.trim().toLowerCase(),
      collection,
    ])
  )

  const parents = new Set<string>()
  for (const collection of collections) {
    const handle = collection.handle.trim().toLowerCase()
    const parts = handle.split("-")
    if (parts.length < 2) continue

    // Prefer the longest existing parent prefix (e.g. one-piece over one).
    for (let i = parts.length - 1; i >= 1; i--) {
      const parent = parts.slice(0, i).join("-")
      if (RESERVED_GAME_HANDLES.has(parent)) continue
      if (byHandle.has(parent)) {
        parents.add(parent)
        break
      }
    }
  }

  const results = await Promise.all(
    [...parents].map(async (handle) => {
      const collection = byHandle.get(handle)
      if (!collection) return null

      const image = await resolveCollectionImage(handle, collection.image)
      return {
        handle,
        title: collection.title.trim() || humanizeHandle(handle),
        imageUrl: image.url,
        imageAlt: image.alt,
      } satisfies PrimaryTcgCollection
    })
  )

  return results
    .filter((entry): entry is PrimaryTcgCollection => entry != null)
    .sort((a, b) => a.title.localeCompare(b.title))
}

/**
 * Build TCG navigation cards from a merchandising product list.
 * Only includes TCGs that have at least one matching product.
 */
export function buildGameFacetsFromProducts(
  games: PrimaryTcgCollection[],
  products: Product[]
): BrowseFacet[] {
  return games
    .map((game) => {
      const matches = products.filter((product) =>
        productMatchesGame(product, game.handle)
      )
      const fallbackImage = matches.find((product) => product.image)?.image

      return {
        handle: game.handle,
        slug: game.handle,
        label: game.title.replace(/\s*TCG\s*$/i, "").trim() || game.title,
        imageUrl: game.imageUrl || fallbackImage || null,
        imageAlt: game.imageAlt ?? `${game.title} products`,
        productCount: matches.length,
      } satisfies BrowseFacet
    })
    .filter((facet) => facet.productCount > 0)
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Language facets for a TCG, counted against an already-scoped product list
 * (e.g. preorders belonging to that game).
 */
export async function buildLanguageFacetsForGame(
  gameHandle: string,
  products: Product[],
  options: { hideEmpty?: boolean } = {}
): Promise<BrowseFacet[]> {
  const raw = await getShopifyCollectionLanguageFacets(gameHandle)
  const enriched = enrichLanguageFacets(raw, products)

  if (options.hideEmpty) {
    return enriched.filter((facet) => facet.productCount > 0)
  }

  return enriched
}

/** Filter products that belong to a game handle. */
export function filterProductsByGame(
  products: Product[],
  gameHandle: string
): Product[] {
  return products.filter((product) => productMatchesGame(product, gameHandle))
}

/** Filter products that belong to a language facet slug. */
export function filterProductsByLanguage(
  products: Product[],
  languageSlug: string
): Product[] {
  return products.filter((product) =>
    productMatchesLanguageFacet(product, languageSlug)
  )
}
