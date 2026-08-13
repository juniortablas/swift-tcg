/**
 * Homepage Shopify loaders.
 *
 * Prefer the Homepage orchestration metaobject (`homepage`) as the single
 * source of truth. When no Homepage entry exists, fall back to per-type
 * merchandising lists + catalog / Visual fallbacks
 * (see `homepageMerchandising.ts` + docs/STOREFRONT_CMS.md).
 */

import type { Product } from "@/types/product"

import { cache } from "react"

import { catalogFetchOptions } from "./cache"
import { shopifyFetch } from "./client"
import {
  featuredCollectionsFromMetaobjects,
  featuredProductsFromMetaobjects,
  getHomepageConfig,
  getHomepageFeaturedCollectionEntries,
  getHomepageFeaturedProductEntries,
  promotionFromMetaobject,
  getHomepageActivePromotion,
  type HomepagePromotion,
} from "./homepageMerchandising"
import { mapShopifyProducts } from "./mappers"
import { applyWeeklyRestockLimits } from "./weeklyRestockAvailability"
import {
  GET_COMING_SOON_COLLECTION_PRODUCTS,
  GET_COMING_SOON_PRODUCTS,
  GET_PRODUCTS,
} from "./queries"
import {
  getHomepageCategoryCards,
  getHomepageHeroSlides,
  homepageHeroSlideFromHero,
  storefrontHeroFromMetaobject,
  type HomepageCategoryCard,
  type HomepageHeroSlide,
} from "./storefrontCms"
import type {
  CollectionProductsQueryResult,
  Product as ShopifyProduct,
  ProductsQueryResult,
} from "./types"

export type HomepageFeaturedProductsResult = {
  products: Product[]
  /** Optional merchandising badge overrides keyed by product id. */
  badges: Record<string, string>
  /** True when entries came from metaobjects (not the Coming Soon fallback). */
  fromCms: boolean
}

/** Full homepage payload for `app/(store)/page.tsx`. */
export type HomepagePageData = {
  heroSlides: HomepageHeroSlide[]
  featured: HomepageFeaturedProductsResult
  /** First product rail (Featured / Coming Soon). */
  showComingSoon: boolean
  /** Heading for the featured products rail when `featured.fromCms`. */
  featuredProductsTitle: string
  categoryCards: HomepageCategoryCard[]
  showCategories: boolean
  /** Heading for Shop by Category. */
  featuredCollectionsTitle: string
  promotion: HomepagePromotion | null
  newestArrivals: Product[]
  showLatestReleases: boolean
  showNewsletter: boolean
}

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
    query: GET_COMING_SOON_COLLECTION_PRODUCTS,
    variables: { handle, first },
    ...catalogFetchOptions,
  })

  return data.collection?.products.edges.map((edge) => edge.node) ?? []
}

/**
 * Coming Soon rail — prefer the Shopify "Preorders" collection.
 * Falls back to products tagged `preorder` / `pre-order` when the
 * collection is missing or empty.
 *
 * Order (homepage Coming Soon only):
 * 1. Products with `swift.homepage_position` ascending
 * 2. Products without the metafield, preserving Shopify collection/tag order
 * Ties on the same position keep relative order.
 */
export async function getShopifyComingSoonProducts(
  limit = 8
): Promise<Product[]> {
  const fetchCount = Math.max(limit * 5, 40)
  const fromCollection = await fetchCollectionProducts(
    PREORDERS_COLLECTION_HANDLE,
    fetchCount
  )

  if (fromCollection.length > 0) {
    return applyWeeklyRestockLimits(
      mapShopifyProducts(sortComingSoonProducts(fromCollection)).slice(
        0,
        limit
      )
    )
  }

  const data = await shopifyFetch<ProductsQueryResult>({
    query: GET_COMING_SOON_PRODUCTS,
    variables: { first: fetchCount },
    ...catalogFetchOptions,
  })

  const tagged = data.products.edges
    .map((edge) => edge.node)
    .filter(isPreorderTagged)

  return applyWeeklyRestockLimits(
    mapShopifyProducts(sortComingSoonProducts(tagged)).slice(0, limit)
  )
}

function parseHomepagePosition(product: ShopifyProduct): number | null {
  const raw = product.homepagePosition?.value?.trim()
  if (!raw) return null
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? value : null
}

/** Stable sort: positioned products first (asc), then unpositioned in place. */
function sortComingSoonProducts(products: ShopifyProduct[]): ShopifyProduct[] {
  return products
    .map((product, index) => ({ product, index, position: parseHomepagePosition(product) }))
    .sort((a, b) => {
      if (a.position != null && b.position != null) {
        if (a.position !== b.position) return a.position - b.position
        return a.index - b.index
      }
      if (a.position != null) return -1
      if (b.position != null) return 1
      return a.index - b.index
    })
    .map((entry) => entry.product)
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
    ...catalogFetchOptions,
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

async function featuredResultFromEntries(
  entries: Awaited<ReturnType<typeof getHomepageFeaturedProductEntries>>,
  limit: number
): Promise<HomepageFeaturedProductsResult | null> {
  if (entries.length === 0) return null
  const sliced = entries.slice(0, limit)
  const badges: Record<string, string> = {}
  const mapped = sliced.map((entry) => {
    if (entry.badge) badges[entry.product.id] = entry.badge
    return entry.product
  })
  return {
    products: await applyWeeklyRestockLimits(mapped),
    badges,
    fromCms: true,
  }
}

/**
 * Featured product rail — CMS metaobjects first, Coming Soon catalog fallback.
 * Prefer `getHomepagePageData()` when rendering the homepage.
 */
export async function getHomepageFeaturedProducts(
  limit = 8
): Promise<HomepageFeaturedProductsResult> {
  const entries = await getHomepageFeaturedProductEntries()
  const fromCms = await featuredResultFromEntries(entries, limit)
  if (fromCms) return fromCms

  const products = await getShopifyComingSoonProducts(limit)
  return { products, badges: {}, fromCms: false }
}

/**
 * Shop by Category cards — CMS featured collections first, Visual fallbacks.
 * Prefer `getHomepagePageData()` when rendering the homepage.
 */
export async function getHomepageFeaturedCollections(): Promise<
  HomepageCategoryCard[]
> {
  const entries = await getHomepageFeaturedCollectionEntries()
  if (entries.length > 0) return entries
  return getHomepageCategoryCards()
}

async function resolveFeaturedRail(
  curated: HomepageFeaturedProductsResult | null,
  showComingSoon: boolean,
  limit: number
): Promise<{
  featured: HomepageFeaturedProductsResult
  showComingSoon: boolean
}> {
  if (curated) {
    return { featured: curated, showComingSoon: true }
  }
  if (!showComingSoon) {
    return {
      featured: { products: [], badges: {}, fromCms: false },
      showComingSoon: false,
    }
  }
  const products = await getShopifyComingSoonProducts(limit)
  return {
    featured: { products, badges: {}, fromCms: false },
    showComingSoon: true,
  }
}

/**
 * Single homepage load: Homepage metaobject when present, else legacy fallbacks.
 * Preserves layout, caching (`storefront-cms` tag + webhook invalidation), and section fallbacks.
 * Cached per request so `generateMetadata` + page share one load.
 */
export const getHomepagePageData = cache(
  async (limit = 8): Promise<HomepagePageData> => {
    const config = await getHomepageConfig()

    if (!config) {
      const [featured, newestArrivals, heroSlides, categoryCards, promotion] =
        await Promise.all([
          getHomepageFeaturedProducts(limit),
          getShopifyNewestArrivals(limit),
          getHomepageHeroSlides(),
          getHomepageFeaturedCollections(),
          getHomepageActivePromotion(),
        ])

      return {
        heroSlides,
        featured,
        showComingSoon: true,
        featuredProductsTitle: "Featured",
        categoryCards,
        showCategories: true,
        featuredCollectionsTitle: "Shop by Category",
        promotion,
        newestArrivals,
        showLatestReleases: true,
        showNewsletter: true,
      }
    }

    const curatedFeatured = await featuredResultFromEntries(
      featuredProductsFromMetaobjects(config.featuredProducts),
      limit
    )
    const curatedCollections = featuredCollectionsFromMetaobjects(
      config.featuredCollections
    )
    const promotion = promotionFromMetaobject(config.promotion)

    const heroFromCms = config.hero
      ? storefrontHeroFromMetaobject(config.hero)
      : null
    const heroSlidesPromise =
      heroFromCms && heroFromCms.enabled
        ? Promise.resolve([homepageHeroSlideFromHero(heroFromCms)])
        : getHomepageHeroSlides()

    const categoryCardsPromise =
      curatedCollections.length > 0
        ? Promise.resolve(curatedCollections)
        : config.showCategories
          ? getHomepageCategoryCards()
          : Promise.resolve([])

    const newestPromise = config.showLatestReleases
      ? getShopifyNewestArrivals(limit)
      : Promise.resolve([])

    const [heroSlides, featuredRail, categoryCards, newestArrivals] =
      await Promise.all([
        heroSlidesPromise,
        resolveFeaturedRail(curatedFeatured, config.showComingSoon, limit),
        categoryCardsPromise,
        newestPromise,
      ])

    return {
      heroSlides,
      featured: featuredRail.featured,
      showComingSoon: featuredRail.showComingSoon,
      featuredProductsTitle: config.featuredProductsTitle || "Featured",
      categoryCards,
      showCategories: config.showCategories,
      featuredCollectionsTitle:
        config.featuredCollectionsTitle || "Shop by Category",
      promotion,
      newestArrivals,
      showLatestReleases: config.showLatestReleases,
      showNewsletter: config.showNewsletter,
    }
  }
)
