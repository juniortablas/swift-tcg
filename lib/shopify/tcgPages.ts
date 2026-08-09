/**
 * TCG collection route helpers.
 *
 * URL convention (data-driven, no hardcoded languages):
 *   /{game}              → language picker (multi-language) or catalog (single)
 *   /{game}/{language}   → language-filtered catalog
 *
 * Game handles come from Shopify primary TCG collections.
 * Language slugs come from child collections `{game}-{language}`.
 */

import {
  COLLECTIONS,
  type CollectionId,
  type CollectionPresentation,
} from "@/lib/catalog/collections"
import {
  enrichLanguageFacets,
  getShopifyCollectionLanguageFacets,
  type CollectionLanguageFacet,
} from "@/lib/shopify/collectionFacets"
import { shopifyFetch } from "@/lib/shopify/client"
import { getShopifyProducts } from "@/lib/shopify/products"
import { GET_COLLECTIONS } from "@/lib/shopify/queries"
import { RESERVED_GAME_HANDLES } from "@/lib/shopify/reservedHandles"
import {
  applyStorefrontHeroToPresentation,
  heroKeyForCollection,
  resolveVisualImage,
  storefrontCmsKeyPrefix,
  visualKeyForLanguageFacet,
} from "@/lib/shopify/storefrontCms"
import type { CollectionsQueryResult } from "@/lib/shopify/types"
import type { Product } from "@/types/product"

export { RESERVED_GAME_HANDLES }

const DEFAULT_ATMOSPHERE =
  "bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,255,255,0.14)_0%,transparent_42%),linear-gradient(125deg,#0a0a0a_0%,#171717_48%,#404040_100%)]"

export type TcgCollectionPayload = {
  gameHandle: string
  presentation: CollectionPresentation
  /** All products in the parent TCG collection (for counts / single-language). */
  parentProducts: Product[]
  /** Products to show in the grid (language-filtered or parent). */
  products: Product[]
  languageFacets: CollectionLanguageFacet[]
  selectedLanguage: string | null
  /** True when the shopper must pick a language before seeing the grid. */
  requiresLanguagePick: boolean
}

function humanizeHandle(handle: string): string {
  return handle
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function resolveTcgPresentation(
  gameHandle: string,
  shopifyTitle?: string | null
): CollectionPresentation {
  const known = COLLECTIONS[gameHandle as CollectionId]
  if (known) {
    return {
      title: known.title,
      description: known.description,
      breadcrumb: known.breadcrumb,
      searchPlaceholder: known.searchPlaceholder,
      atmosphere: known.atmosphere,
      images: known.images,
    }
  }

  const title = shopifyTitle?.trim() || humanizeHandle(gameHandle)
  const display = /\btcg\b/i.test(title) ? title : `${title} TCG`

  return {
    title: display,
    breadcrumb: title.replace(/\s*TCG\s*$/i, "").trim() || title,
    description: `Authentic ${display} sealed product — factory sealed and ready to ship.`,
    searchPlaceholder: `Search ${display} products...`,
    atmosphere: DEFAULT_ATMOSPHERE,
    images: [],
  }
}

function heroKeyForGame(gameHandle: string): string {
  if (gameHandle === "pokemon" || gameHandle === "one-piece") {
    return heroKeyForCollection(gameHandle)
  }
  return `${storefrontCmsKeyPrefix(gameHandle)}-hero`
}

async function applyLanguageVisuals(
  gameHandle: string,
  facets: CollectionLanguageFacet[]
): Promise<CollectionLanguageFacet[]> {
  return Promise.all(
    facets.map(async (facet) => {
      const resolved = await resolveVisualImage(
        visualKeyForLanguageFacet(gameHandle, facet.slug),
        { url: facet.imageUrl, alt: facet.imageAlt }
      )
      return {
        ...facet,
        imageUrl: resolved.url,
        imageAlt: resolved.alt,
      }
    })
  )
}

async function findShopifyCollectionTitle(
  handle: string
): Promise<string | null> {
  const target = handle.trim().toLowerCase()
  let after: string | null | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<CollectionsQueryResult>({
      query: GET_COLLECTIONS,
      variables: { first: 50, ...(after ? { after } : {}) },
    })

    for (const edge of data.collections.edges) {
      if (edge.node.handle.trim().toLowerCase() === target) {
        return edge.node.title
      }
    }

    hasNextPage = data.collections.pageInfo?.hasNextPage ?? false
    after = data.collections.pageInfo?.endCursor ?? undefined
  }

  return null
}

/**
 * Resolve a TCG game landing or language page from the URL segments.
 * Returns null when the game (or language) is not a valid Shopify TCG collection.
 */
export async function loadTcgCollectionPage(options: {
  gameHandle: string
  languageSlug?: string | null
}): Promise<TcgCollectionPayload | null> {
  const gameHandle = options.gameHandle.trim().toLowerCase()
  if (!gameHandle || RESERVED_GAME_HANDLES.has(gameHandle)) {
    return null
  }

  const shopifyTitle = await findShopifyCollectionTitle(gameHandle)
  if (!shopifyTitle) return null

  const basePresentation = resolveTcgPresentation(gameHandle, shopifyTitle)
  const presentation = await applyStorefrontHeroToPresentation(
    heroKeyForGame(gameHandle),
    basePresentation
  )
  const category = presentation.title

  const [parentProducts, rawFacets] = await Promise.all([
    getShopifyProducts({
      collectionHandle: gameHandle,
      category,
    }),
    getShopifyCollectionLanguageFacets(gameHandle),
  ])

  const languageFacets = await applyLanguageVisuals(
    gameHandle,
    enrichLanguageFacets(rawFacets, parentProducts)
  )
  // Multi-language TCGs require an explicit language pick before the grid.
  // Single-language TCGs still show the language card but load products immediately.
  const requiresLanguagePick = languageFacets.length >= 2

  const languageSlug = options.languageSlug?.trim().toLowerCase() || null

  if (languageSlug) {
    const facet = languageFacets.find((entry) => entry.slug === languageSlug)
    // Allow Coming Soon facets to 404 only when empty and navigated directly
    // with zero products — language cards stay visible as disabled otherwise.
    if (!facet || facet.productCount === 0) return null

    const products = await getShopifyProducts({
      collectionHandle: facet.handle,
      category,
    })

    return {
      gameHandle,
      presentation: {
        ...presentation,
        searchPlaceholder: `Search ${facet.label} ${presentation.breadcrumb} products...`,
      },
      parentProducts,
      products,
      languageFacets,
      selectedLanguage: facet.slug,
      requiresLanguagePick,
    }
  }

  return {
    gameHandle,
    presentation,
    parentProducts,
    products: requiresLanguagePick ? [] : parentProducts,
    languageFacets,
    selectedLanguage: null,
    requiresLanguagePick,
  }
}
