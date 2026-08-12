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
import { getShopifyCollectionByHandle } from "@/lib/shopify/collectionSeo"
import { getShopifyProducts } from "@/lib/shopify/products"
import {
  applyStorefrontHeroToPresentation,
  heroKeyForCollection,
  resolveVisualImage,
  storefrontCmsKeyPrefix,
  visualKeyForLanguageFacet,
} from "@/lib/shopify/storefrontCms"
import type { Product } from "@/types/product"
import { cache } from "react"

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
  shopifySeoTitle: string | null
  shopifySeoDescription: string | null
  shopifyDescription: string | null
  collectionImageUrl: string | null
  collectionImageAlt: string | null
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
 * Cached per request so `generateMetadata` + page share one load.
 */
export async function loadMerchCollectionPage(options: {
  merchKey: MerchCollectionKey
  gameHandle?: string | null
  languageSlug?: string | null
}): Promise<MerchCollectionPayload | null> {
  return loadMerchCollectionPageCached(
    options.merchKey,
    options.gameHandle?.trim().toLowerCase() || null,
    options.languageSlug?.trim().toLowerCase() || null
  )
}

const loadMerchCollectionPageCached = cache(
  async (
    merchKey: MerchCollectionKey,
    gameHandle: string | null,
    languageSlug: string | null
  ): Promise<MerchCollectionPayload | null> => {
    const config = MERCH_CONFIG[merchKey]
    const basePath = `/${merchKey}`

    // Parallelize presentation, SEO, catalog, and TCG discovery.
    const [presentation, shopifyCollection, allProducts, primaryGames] =
      await Promise.all([
        presentationFor(merchKey),
        getShopifyCollectionByHandle(config.shopifyHandle),
        getShopifyProducts({
          collectionHandle: config.shopifyHandle,
        }),
        discoverPrimaryTcgCollections(),
      ])

    const seoFields = {
      shopifySeoTitle: shopifyCollection?.seo.title ?? null,
      shopifySeoDescription: shopifyCollection?.seo.description ?? null,
      shopifyDescription:
        shopifyCollection?.description ||
        shopifyCollection?.descriptionHtml ||
        null,
      collectionImageUrl:
        presentation.images.find((image) => image.alt)?.src ||
        presentation.images[0]?.src ||
        shopifyCollection?.imageUrl ||
        null,
      collectionImageAlt:
        presentation.images.find((image) => image.alt)?.alt ||
        shopifyCollection?.imageAlt ||
        presentation.title,
    }

    const gameFacets = await applyGameVisuals(
      buildGameFacetsFromProducts(primaryGames, allProducts)
    )
    const requiresGamePick = gameFacets.length >= 1

    if (!gameHandle) {
      if (languageSlug) return null

      return {
        merchKey,
        basePath,
        presentation,
        ...seoFields,
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
        ...seoFields,
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
      ...seoFields,
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
)
