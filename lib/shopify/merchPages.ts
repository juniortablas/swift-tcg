/**
 * Merchandising collection pages (Preorders, New Releases).
 *
 * Browse flow (data-driven, no hardcoded TCGs/languages):
 *   /{merch}                      → pick TCG
 *   /{merch}/{game}               → pick language
 *   /{merch}/{game}/{language}    → products
 */

import {
  COLLECTIONS,
  type CollectionId,
  type CollectionPresentation,
} from "@/lib/catalog/collections"
import {
  buildGameFacetsFromProducts,
  buildLanguageFacetsForGame,
  discoverPrimaryTcgCollections,
  filterProductsByGame,
  filterProductsByLanguage,
  type BrowseFacet,
} from "@/lib/shopify/browseHierarchy"
import { getShopifyProducts } from "@/lib/shopify/products"
import {
  applyStorefrontHeroToPresentation,
  heroKeyForCollection,
  resolveVisualImage,
  storefrontCmsKeyPrefix,
  visualKeyForLanguageFacet,
} from "@/lib/shopify/storefrontCms"
import type { Product } from "@/types/product"

export type MerchCollectionKey = "preorders" | "new-releases"

/** App route segment → Shopify collection handle + presentation id. */
const MERCH_CONFIG: Record<
  MerchCollectionKey,
  {
    shopifyHandle: string
    presentationId: CollectionId
  }
> = {
  preorders: {
    shopifyHandle: "preorders",
    presentationId: "preorders",
  },
  "new-releases": {
    shopifyHandle: "new-arrivals",
    presentationId: "new-releases",
  },
}

export type MerchCollectionPayload = {
  merchKey: MerchCollectionKey
  basePath: string
  presentation: CollectionPresentation
  /** All products in the merchandising collection. */
  allProducts: Product[]
  /** Products to show in the grid (empty until game + language chosen). */
  products: Product[]
  gameFacets: BrowseFacet[]
  languageFacets: BrowseFacet[]
  selectedGame: string | null
  selectedLanguage: string | null
  selectedGameLabel: string | null
  selectedLanguageLabel: string | null
  /** Hero count — full merch catalog size. */
  heroProductCount: number
  requiresGamePick: boolean
  requiresLanguagePick: boolean
}

async function presentationFor(
  merchKey: MerchCollectionKey
): Promise<CollectionPresentation> {
  const { presentationId } = MERCH_CONFIG[merchKey]
  const collection = COLLECTIONS[presentationId]
  const base: CollectionPresentation = {
    title: collection.title,
    description: collection.description,
    breadcrumb: collection.breadcrumb,
    searchPlaceholder: collection.searchPlaceholder,
    atmosphere: collection.atmosphere,
    images: collection.images,
  }

  return applyStorefrontHeroToPresentation(
    heroKeyForCollection(presentationId),
    base
  )
}

async function applyGameVisuals(facets: BrowseFacet[]): Promise<BrowseFacet[]> {
  return Promise.all(
    facets.map(async (facet) => {
      const key = `homepage-category-${storefrontCmsKeyPrefix(facet.slug)}`
      const resolved = await resolveVisualImage(key, {
        url: facet.imageUrl,
        alt: facet.imageAlt,
      })
      return {
        ...facet,
        imageUrl: resolved.url,
        imageAlt: resolved.alt,
      }
    })
  )
}

async function applyLanguageVisuals(
  gameHandle: string,
  facets: BrowseFacet[]
): Promise<BrowseFacet[]> {
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

/**
 * Resolve a merchandising browse page from URL segments.
 * Returns null when a selected game/language is invalid for this merch set.
 */
export async function loadMerchCollectionPage(options: {
  merchKey: MerchCollectionKey
  gameHandle?: string | null
  languageSlug?: string | null
}): Promise<MerchCollectionPayload | null> {
  const { merchKey } = options
  const config = MERCH_CONFIG[merchKey]
  const basePath = `/${merchKey}`
  const presentation = await presentationFor(merchKey)

  const allProducts = await getShopifyProducts({
    collectionHandle: config.shopifyHandle,
  })

  const primaryGames = await discoverPrimaryTcgCollections()
  const gameFacets = await applyGameVisuals(
    buildGameFacetsFromProducts(primaryGames, allProducts)
  )
  const requiresGamePick = gameFacets.length >= 1

  const gameHandle = options.gameHandle?.trim().toLowerCase() || null
  const languageSlug = options.languageSlug?.trim().toLowerCase() || null

  if (!gameHandle) {
    if (languageSlug) return null

    return {
      merchKey,
      basePath,
      presentation,
      allProducts,
      // Fall back to a flat product grid when no TCG facets can be derived.
      products: requiresGamePick ? [] : allProducts,
      gameFacets,
      languageFacets: [],
      selectedGame: null,
      selectedLanguage: null,
      selectedGameLabel: null,
      selectedLanguageLabel: null,
      heroProductCount: allProducts.length,
      requiresGamePick,
      requiresLanguagePick: false,
    }
  }

  const gameFacet = gameFacets.find((facet) => facet.slug === gameHandle)
  if (!gameFacet) return null

  const gameProducts = filterProductsByGame(allProducts, gameHandle)
  const languageFacets = await applyLanguageVisuals(
    gameHandle,
    await buildLanguageFacetsForGame(gameHandle, gameProducts, {
      hideEmpty: true,
    })
  )
  const requiresLanguagePick = languageFacets.length >= 1

  if (!languageSlug) {
    return {
      merchKey,
      basePath,
      presentation: {
        ...presentation,
        searchPlaceholder: `Search ${gameFacet.label} ${presentation.breadcrumb.toLowerCase()}...`,
      },
      allProducts,
      products: requiresLanguagePick ? [] : gameProducts,
      gameFacets,
      languageFacets,
      selectedGame: gameFacet.slug,
      selectedLanguage: null,
      selectedGameLabel: gameFacet.label,
      selectedLanguageLabel: null,
      heroProductCount: allProducts.length,
      requiresGamePick,
      requiresLanguagePick,
    }
  }

  const languageFacet = languageFacets.find(
    (facet) => facet.slug === languageSlug
  )
  if (!languageFacet) return null

  const products = filterProductsByLanguage(gameProducts, languageSlug)

  return {
    merchKey,
    basePath,
    presentation: {
      ...presentation,
      searchPlaceholder: `Search ${languageFacet.label} ${gameFacet.label} ${presentation.breadcrumb.toLowerCase()}...`,
    },
    allProducts,
    products,
    gameFacets,
    languageFacets,
    selectedGame: gameFacet.slug,
    selectedLanguage: languageFacet.slug,
    selectedGameLabel: gameFacet.label,
    selectedLanguageLabel: languageFacet.label,
    heroProductCount: allProducts.length,
    requiresGamePick,
    requiresLanguagePick,
  }
}
