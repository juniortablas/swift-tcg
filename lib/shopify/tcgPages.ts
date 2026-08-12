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
  productMatchesLanguageFacet,
  type CollectionLanguageFacet,
} from "@/lib/shopify/collectionFacets"
import { getShopifyCollectionByHandle } from "@/lib/shopify/collectionSeo"
import { getShopifyProducts } from "@/lib/shopify/products"
import { RESERVED_GAME_HANDLES } from "@/lib/shopify/reservedHandles"
import {
  applyStorefrontHeroToPresentation,
  heroKeyForCollection,
  resolveVisualImage,
  storefrontCmsKeyPrefix,
  visualKeyForLanguageFacet,
} from "@/lib/shopify/storefrontCms"
import type { Product } from "@/types/product"
import { cache } from "react"

export { RESERVED_GAME_HANDLES }

const LANGUAGE_PARENT_HANDLES = ["one-piece", "pokemon"] as const

/**
 * `/pokemon-japanese` is a Shopify handle, not a storefront route.
 * Canonical URL is `/{game}/{language}` — redirect to avoid duplicate catalog URLs.
 */
export function tcgLanguageHandleRedirect(gameHandle: string): string | null {
  const handle = gameHandle.trim().toLowerCase()
  if (!handle) return null
  for (const parent of LANGUAGE_PARENT_HANDLES) {
    const prefix = `${parent}-`
    if (handle.startsWith(prefix)) {
      const slug = handle.slice(prefix.length)
      if (slug) return `/${parent}/${slug}`
    }
  }
  return null
}

const DEFAULT_ATMOSPHERE =
  "bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,255,255,0.14)_0%,transparent_42%),linear-gradient(125deg,#0a0a0a_0%,#171717_48%,#404040_100%)]"

export type TcgCollectionPayload = {
  gameHandle: string
  presentation: CollectionPresentation
  /** Shopify collection SEO when available. */
  shopifySeoTitle: string | null
  shopifySeoDescription: string | null
  shopifyDescription: string | null
  collectionImageUrl: string | null
  collectionImageAlt: string | null
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

/**
 * Resolve a TCG game landing or language page from the URL segments.
 * Returns null when the game (or language) is not a valid Shopify TCG collection.
 * Cached per request so `generateMetadata` + page share one load.
 */
export async function loadTcgCollectionPage(options: {
  gameHandle: string
  languageSlug?: string | null
}): Promise<TcgCollectionPayload | null> {
  return loadTcgCollectionPageCached(
    options.gameHandle.trim().toLowerCase(),
    options.languageSlug?.trim().toLowerCase() || null
  )
}

const loadTcgCollectionPageCached = cache(
  async (
    gameHandle: string,
    languageSlug: string | null
  ): Promise<TcgCollectionPayload | null> => {
    if (!gameHandle || RESERVED_GAME_HANDLES.has(gameHandle)) {
      return null
    }

    const shopifyCollection = await getShopifyCollectionByHandle(gameHandle)
    if (!shopifyCollection) return null

    const basePresentation = resolveTcgPresentation(
      gameHandle,
      shopifyCollection.title
    )
    const category = basePresentation.title

    // Parallelize hero CMS, catalog, and facet discovery.
    const [presentation, parentProducts, rawFacets] = await Promise.all([
      applyStorefrontHeroToPresentation(
        heroKeyForGame(gameHandle),
        basePresentation
      ),
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

    const seoFields = {
      shopifySeoTitle: shopifyCollection.seo.title,
      shopifySeoDescription: shopifyCollection.seo.description,
      shopifyDescription:
        shopifyCollection.description ||
        shopifyCollection.descriptionHtml ||
        null,
      collectionImageUrl:
        presentation.images[0]?.src || shopifyCollection.imageUrl || null,
      collectionImageAlt:
        presentation.images[0]?.alt ||
        shopifyCollection.imageAlt ||
        presentation.title,
    }

    if (languageSlug) {
      const facet = languageFacets.find((entry) => entry.slug === languageSlug)
      // Allow Coming Soon facets to 404 only when empty and navigated directly
      // with zero products — language cards stay visible as disabled otherwise.
      if (!facet || facet.productCount === 0) return null

      // Filter the already-loaded parent catalog — avoids a second full collection walk.
      const products = parentProducts.filter((product) =>
        productMatchesLanguageFacet(product, facet.slug)
      )

      return {
        gameHandle,
        presentation: {
          ...presentation,
          searchPlaceholder: `Search ${facet.label} ${presentation.breadcrumb} products...`,
        },
        ...seoFields,
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
      ...seoFields,
      parentProducts,
      products: requiresLanguagePick ? [] : parentProducts,
      languageFacets,
      selectedLanguage: null,
      requiresLanguagePick,
    }
  }
)
