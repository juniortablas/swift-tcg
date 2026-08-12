/**
 * Homepage merchandising CMS via Shopify Metaobjects.
 *
 * Types (created by `npm run setup:cms`):
 *   - homepage (orchestration — single source of truth)
 *   - homepage_featured_product
 *   - homepage_featured_collection
 *   - homepage_promotion
 *
 * Follows the same fetch / cache / fallback pattern as storefrontCms.ts.
 * High-level homepage composers with catalog fallbacks live in `homepage.ts`.
 * See docs/STOREFRONT_CMS.md.
 */

import { cache } from "react"

import { shopifyFetch, ShopifyClientError } from "./client"
import { mapShopifyProduct } from "./mappers"
import { GET_HOMEPAGE, GET_METAOBJECTS_BY_TYPE } from "./queries"
import {
  normalizeStorefrontHref,
  type HomepageCategoryCard,
} from "./storefrontCms"
import type {
  Collection as ShopifyCollection,
  MetaobjectsByTypeQueryResult,
  Product as ShopifyProduct,
  ShopifyMetaobject,
  ShopifyMetaobjectField,
} from "./types"
import type { Product } from "@/types/product"

/** Shopify metaobject type handles for homepage merchandising. */
export const HOMEPAGE_TYPE = "homepage"
export const HOMEPAGE_FEATURED_PRODUCT_TYPE = "homepage_featured_product"
export const HOMEPAGE_FEATURED_COLLECTION_TYPE =
  "homepage_featured_collection"
export const HOMEPAGE_PROMOTION_TYPE = "homepage_promotion"

const CMS_FETCH_OPTIONS = {
  cache: "no-store" as const,
  next: {
    tags: ["storefront-cms"],
  },
}

export type HomepageFeaturedProductEntry = {
  product: Product
  badge: string | null
  sortOrder: number
}

export type HomepagePromotion = {
  title: string
  description: string
  desktopImage: string
  mobileImage: string
  ctaText: string
  ctaLink: string
}

const DEFAULT_COLLECTION_ATMOSPHERE =
  "bg-[radial-gradient(ellipse_at_70%_30%,rgba(34,197,94,0.18)_0%,transparent_45%),linear-gradient(125deg,#052e16_0%,#14532d_48%,#166534_100%)]"

const DEFAULT_COLLECTION_IMAGE_CLASS =
  "absolute -right-[10%] top-1/2 h-[195%] w-auto -translate-y-1/2 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)]"

/** Preserve known category atmospheres when CMS collections match those handles. */
const COLLECTION_ATMOSPHERES: Record<
  string,
  { atmosphere: string; imageClassName: string; subtitle: string }
> = {
  pokemon: {
    subtitle: "Japanese sealed sets",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_85%_15%,rgba(233,213,255,0.65)_0%,transparent_42%),radial-gradient(ellipse_at_15%_100%,rgba(126,34,206,0.45)_0%,transparent_48%),linear-gradient(125deg,#2e1065_0%,#6b21a8_40%,#a21caf_100%)]",
    imageClassName:
      "absolute -right-[10%] top-1/2 h-[195%] w-auto -translate-y-1/2 rotate-3 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)]",
  },
  "one-piece": {
    subtitle: "Bandai sealed product",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_85%_10%,rgba(254,215,170,0.6)_0%,transparent_42%),radial-gradient(ellipse_at_10%_95%,rgba(185,28,28,0.55)_0%,transparent_48%),linear-gradient(125deg,#7f1d1d_0%,#c2410c_42%,#ea580c_100%)]",
    imageClassName:
      "absolute -right-[10%] top-1/2 h-[195%] w-auto -translate-y-1/2 -rotate-2 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)]",
  },
  preorders: {
    subtitle: "Upcoming releases",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_70%_30%,rgba(253,224,71,0.28)_0%,transparent_45%),linear-gradient(125deg,#020617_0%,#1e293b_48%,#334155_100%)]",
    imageClassName:
      "absolute -right-[12%] top-1/2 h-[180%] w-auto -translate-y-1/2 rotate-8 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)]",
  },
}

function fieldMap(
  fields: ShopifyMetaobjectField[]
): Map<string, ShopifyMetaobjectField> {
  return new Map(fields.map((field) => [field.key, field]))
}

function fieldText(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string
): string | null {
  const value = fields.get(key)?.value?.trim()
  return value ? value : null
}

function fieldBool(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string,
  fallback = true
): boolean {
  const raw = fields.get(key)?.value?.trim().toLowerCase()
  if (raw === "true") return true
  if (raw === "false") return false
  return fallback
}

function fieldInt(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string,
  fallback = 0
): number {
  const raw = fields.get(key)?.value?.trim()
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function fieldImageUrl(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string
): string | null {
  const ref = fields.get(key)?.reference
  if (!ref || ref.__typename !== "MediaImage") return null
  const url = ref.image?.url?.trim()
  return url || null
}

function fieldProduct(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string
): ShopifyProduct | null {
  const ref = fields.get(key)?.reference
  if (!ref || ref.__typename !== "Product") return null
  return ref
}

function fieldCollection(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string
): ShopifyCollection | null {
  const ref = fields.get(key)?.reference
  if (!ref || ref.__typename !== "Collection") return null
  return ref
}

function fieldMetaobject(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string
): ShopifyMetaobject | null {
  const ref = fields.get(key)?.reference
  if (!ref || ref.__typename !== "Metaobject") return null
  return ref
}

function fieldMetaobjectList(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string
): ShopifyMetaobject[] {
  const field = fields.get(key)
  const fromConnection =
    field?.references?.edges
      ?.map((edge) => edge.node)
      .filter(
        (node): node is ShopifyMetaobject & { __typename: "Metaobject" } =>
          node.__typename === "Metaobject"
      ) ?? []
  if (fromConnection.length > 0) return fromConnection

  // Single reference stored on a list field (or partial Storefront payload).
  const single = fieldMetaobject(fields, key)
  return single ? [single] : []
}

async function fetchAllMetaobjects(
  type: string
): Promise<ShopifyMetaobject[]> {
  const nodes: ShopifyMetaobject[] = []
  let after: string | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<MetaobjectsByTypeQueryResult>({
      query: GET_METAOBJECTS_BY_TYPE,
      variables: { type, first: 100, after },
      ...CMS_FETCH_OPTIONS,
    })

    for (const edge of data.metaobjects.edges) {
      nodes.push(edge.node)
    }

    hasNextPage = data.metaobjects.pageInfo?.hasNextPage ?? false
    after = data.metaobjects.pageInfo?.endCursor ?? undefined
  }

  return nodes
}

function warnCmsLoad(type: string, error: unknown): void {
  if (
    error instanceof ShopifyClientError ||
    (error instanceof Error && /metaobject/i.test(error.message))
  ) {
    console.warn(
      `[storefront-cms] Failed to load ${type} — using homepage fallbacks.`,
      error instanceof Error ? error.message : error
    )
    return
  }
  throw error
}

export type ParsedFeaturedProduct = {
  product: ShopifyProduct
  badge: string | null
  sortOrder: number
}

export function parseFeaturedProduct(
  node: ShopifyMetaobject
): ParsedFeaturedProduct | null {
  const fields = fieldMap(node.fields)
  if (!fieldBool(fields, "enabled", true)) return null

  const product = fieldProduct(fields, "product")
  if (!product?.handle) return null

  return {
    product,
    badge: fieldText(fields, "badge"),
    sortOrder: fieldInt(fields, "sort_order", 0),
  }
}

export type ParsedFeaturedCollection = {
  collection: ShopifyCollection
  titleOverride: string | null
  descriptionOverride: string | null
  imageOverride: string | null
  sortOrder: number
}

export function parseFeaturedCollection(
  node: ShopifyMetaobject
): ParsedFeaturedCollection | null {
  const fields = fieldMap(node.fields)
  if (!fieldBool(fields, "enabled", true)) return null

  const collection = fieldCollection(fields, "collection")
  if (!collection?.handle) return null

  return {
    collection,
    titleOverride: fieldText(fields, "title_override"),
    descriptionOverride: fieldText(fields, "description_override"),
    imageOverride: fieldImageUrl(fields, "image_override"),
    sortOrder: fieldInt(fields, "sort_order", 0),
  }
}

export type ParsedPromotion = {
  title: string
  description: string
  desktopImage: string | null
  mobileImage: string | null
  ctaText: string | null
  ctaLink: string | null
  startDate: string | null
  endDate: string | null
  handle: string
}

export function parsePromotion(node: ShopifyMetaobject): ParsedPromotion | null {
  const fields = fieldMap(node.fields)
  if (!fieldBool(fields, "enabled", true)) return null

  const title = fieldText(fields, "title")
  if (!title) return null

  return {
    title,
    description: fieldText(fields, "description") || "",
    desktopImage: fieldImageUrl(fields, "desktop_image"),
    mobileImage: fieldImageUrl(fields, "mobile_image"),
    ctaText: fieldText(fields, "cta_text"),
    ctaLink: fieldText(fields, "cta_link"),
    startDate: fieldText(fields, "start_date"),
    endDate: fieldText(fields, "end_date"),
    handle: node.handle,
  }
}

export function isPromotionActive(
  entry: ParsedPromotion,
  now = new Date()
): boolean {
  if (entry.startDate) {
    const start = new Date(entry.startDate)
    if (!Number.isNaN(start.getTime()) && now < start) return false
  }
  if (entry.endDate) {
    const end = new Date(entry.endDate)
    if (!Number.isNaN(end.getTime()) && now > end) return false
  }
  return true
}

function collectionHref(handle: string): string {
  const normalized = handle.trim().toLowerCase()
  if (normalized === "new-arrivals") return "/new-releases"
  return `/${normalized}`
}

export function toCategoryCard(
  entry: ParsedFeaturedCollection
): HomepageCategoryCard | null {
  const { collection } = entry
  const href = normalizeStorefrontHref(collectionHref(collection.handle))
  if (!href) return null

  const known = COLLECTION_ATMOSPHERES[collection.handle]
  const title =
    entry.titleOverride?.trim() || collection.title?.trim() || collection.handle
  const subtitle =
    entry.descriptionOverride?.trim() ||
    known?.subtitle ||
    collection.description?.trim() ||
    ""

  const imageSrc = entry.imageOverride || collection.image?.url || ""

  if (!imageSrc) return null

  return {
    title,
    subtitle,
    href,
    atmosphere: known?.atmosphere ?? DEFAULT_COLLECTION_ATMOSPHERE,
    images: [
      {
        src: imageSrc,
        alt: collection.image?.altText || title,
        className: known?.imageClassName ?? DEFAULT_COLLECTION_IMAGE_CLASS,
      },
    ],
  }
}

export const getHomepageFeaturedProductEntries = cache(
  async (): Promise<HomepageFeaturedProductEntry[]> => {
    try {
      const nodes = await fetchAllMetaobjects(HOMEPAGE_FEATURED_PRODUCT_TYPE)
      return nodes
        .map(parseFeaturedProduct)
        .filter((entry): entry is ParsedFeaturedProduct => entry !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((entry) => ({
          product: mapShopifyProduct(entry.product),
          badge: entry.badge,
          sortOrder: entry.sortOrder,
        }))
    } catch (error) {
      warnCmsLoad(HOMEPAGE_FEATURED_PRODUCT_TYPE, error)
      return []
    }
  }
)

export const getHomepageFeaturedCollectionEntries = cache(
  async (): Promise<HomepageCategoryCard[]> => {
    try {
      const nodes = await fetchAllMetaobjects(HOMEPAGE_FEATURED_COLLECTION_TYPE)
      return nodes
        .map(parseFeaturedCollection)
        .filter((entry): entry is ParsedFeaturedCollection => entry !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(toCategoryCard)
        .filter((card): card is HomepageCategoryCard => card !== null)
    } catch (error) {
      warnCmsLoad(HOMEPAGE_FEATURED_COLLECTION_TYPE, error)
      return []
    }
  }
)

export const getHomepagePromotionEntries = cache(
  async (): Promise<ParsedPromotion[]> => {
    try {
      const nodes = await fetchAllMetaobjects(HOMEPAGE_PROMOTION_TYPE)
      return nodes
        .map(parsePromotion)
        .filter((entry): entry is ParsedPromotion => entry !== null)
        .sort((a, b) => a.handle.localeCompare(b.handle))
    } catch (error) {
      warnCmsLoad(HOMEPAGE_PROMOTION_TYPE, error)
      return []
    }
  }
)

/** Map a parsed promotion into the homepage UI shape, or null if not displayable. */
export function toHomepagePromotion(
  entry: ParsedPromotion
): HomepagePromotion | null {
  if (!isPromotionActive(entry)) return null
  if (!entry.desktopImage && !entry.mobileImage) return null

  const desktopImage = entry.desktopImage || entry.mobileImage || ""
  const mobileImage = entry.mobileImage || entry.desktopImage || ""
  if (!desktopImage) return null

  return {
    title: entry.title,
    description: entry.description,
    desktopImage,
    mobileImage,
    ctaText: entry.ctaText || "Shop Now",
    ctaLink: normalizeStorefrontHref(entry.ctaLink) || "/",
  }
}

/**
 * Active homepage promotion, or null when none are enabled / in-window / imaged.
 * Homepage layout stays unchanged when this returns null.
 *
 * Prefer `getHomepageConfig()` when a Homepage orchestration entry exists;
 * this scans all promotion entries as the no-Homepage fallback.
 */
export async function getHomepageActivePromotion(): Promise<HomepagePromotion | null> {
  const entries = await getHomepagePromotionEntries()
  for (const entry of entries) {
    const promotion = toHomepagePromotion(entry)
    if (promotion) return promotion
  }
  return null
}

/**
 * Raw Homepage orchestration entry resolved from Shopify.
 * `null` when no entry exists — callers must use legacy fallbacks.
 */
export type HomepageConfig = {
  handle: string
  /** Nested Storefront Hero metaobject, when referenced. */
  hero: ShopifyMetaobject | null
  /** Nested Homepage Promotion metaobject, when referenced. */
  promotion: ShopifyMetaobject | null
  /** Nested Homepage Featured Product metaobjects (list order). */
  featuredProducts: ShopifyMetaobject[]
  /** Nested Homepage Featured Collection metaobjects (list order). */
  featuredCollections: ShopifyMetaobject[]
  /** Optional override for the featured products rail heading. */
  featuredProductsTitle: string | null
  /** Optional override for the Shop by Category heading. */
  featuredCollectionsTitle: string | null
  showLatestReleases: boolean
  showComingSoon: boolean
  showCategories: boolean
  showNewsletter: boolean
}

/**
 * Fetch the Homepage metaobject (single source of truth) and resolve nested refs.
 * Prefers handle `homepage` when multiple entries exist; otherwise first entry.
 * Cached per request; uses the same `no-store` + `storefront-cms` tag as other CMS loaders.
 */
export const getHomepageConfig = cache(
  async (): Promise<HomepageConfig | null> => {
    try {
      const data = await shopifyFetch<MetaobjectsByTypeQueryResult>({
        query: GET_HOMEPAGE,
        variables: { type: HOMEPAGE_TYPE, first: 25 },
        ...CMS_FETCH_OPTIONS,
      })

      const nodes = data.metaobjects.edges.map((edge) => edge.node)
      if (nodes.length === 0) return null

      const node =
        nodes.find((entry) => entry.handle === "homepage") ?? nodes[0]
      if (!node) return null

      const fields = fieldMap(node.fields)

      return {
        handle: node.handle,
        hero: fieldMetaobject(fields, "hero"),
        promotion: fieldMetaobject(fields, "promotion"),
        featuredProducts: fieldMetaobjectList(fields, "featured_products"),
        featuredCollections: fieldMetaobjectList(
          fields,
          "featured_collections"
        ),
        featuredProductsTitle: fieldText(fields, "featured_products_title"),
        featuredCollectionsTitle: fieldText(
          fields,
          "featured_collections_title"
        ),
        showLatestReleases: fieldBool(fields, "show_latest_releases", true),
        showComingSoon: fieldBool(fields, "show_coming_soon", true),
        showCategories: fieldBool(fields, "show_categories", true),
        showNewsletter: fieldBool(fields, "show_newsletter", true),
      }
    } catch (error) {
      warnCmsLoad(HOMEPAGE_TYPE, error)
      return null
    }
  }
)

/** Resolve featured product entries from nested Homepage refs (list order). */
export function featuredProductsFromMetaobjects(
  nodes: ShopifyMetaobject[]
): HomepageFeaturedProductEntry[] {
  return nodes
    .map(parseFeaturedProduct)
    .filter((entry): entry is ParsedFeaturedProduct => entry !== null)
    .map((entry) => ({
      product: mapShopifyProduct(entry.product),
      badge: entry.badge,
      sortOrder: entry.sortOrder,
    }))
}

/** Resolve category cards from nested Homepage featured-collection refs. */
export function featuredCollectionsFromMetaobjects(
  nodes: ShopifyMetaobject[]
): HomepageCategoryCard[] {
  return nodes
    .map(parseFeaturedCollection)
    .filter((entry): entry is ParsedFeaturedCollection => entry !== null)
    .map(toCategoryCard)
    .filter((card): card is HomepageCategoryCard => card !== null)
}

/** Resolve an active promotion from a nested Homepage promotion ref. */
export function promotionFromMetaobject(
  node: ShopifyMetaobject | null
): HomepagePromotion | null {
  if (!node) return null
  const parsed = parsePromotion(node)
  if (!parsed) return null
  return toHomepagePromotion(parsed)
}
