/**
 * Storefront marketing CMS via Shopify Metaobjects.
 *
 * Definitions (created by `npm run setup:cms` via Admin GraphQL):
 *   - Storefront Hero   → type `storefront_hero`
 *   - Storefront Visual → type `storefront_visual`
 *
 * Homepage merchandising (featured products / collections / promotions) lives
 * in `homepageMerchandising.ts` and shares the same fetch + `storefront-cms`
 * cache-tag pattern.
 *
 * Loaders fetch all entries once per request (React `cache`) and expose
 * keyed helpers with local asset fallbacks when Shopify content is missing.
 *
 * See docs/STOREFRONT_CMS.md for merchant setup and expected keys.
 */

import { cache } from "react"

import { COLLECTIONS } from "@/lib/catalog/collections"
import type {
  CollectionHeroImage,
  CollectionPresentation,
} from "@/lib/catalog/collections"

import { shopifyFetch, ShopifyClientError } from "./client"
import { GET_METAOBJECTS_BY_TYPE } from "./queries"
import type {
  MetaobjectsByTypeQueryResult,
  ShopifyMetaobject,
  ShopifyMetaobjectField,
} from "./types"

/** Shopify metaobject type handle for page heroes. */
export const STOREFRONT_HERO_TYPE = "storefront_hero"

/** Shopify metaobject type handle for cards / promo images. */
export const STOREFRONT_VISUAL_TYPE = "storefront_visual"

const CMS_FETCH_OPTIONS = {
  // Marketing CMS must reflect Admin image/copy edits on the next request.
  // A long force-cache window made Shopify CDN swaps look like "stuck" local art.
  cache: "no-store" as const,
  next: {
    tags: ["storefront-cms"],
  },
}

export type StorefrontHero = {
  key: string
  title: string
  eyebrow: string
  heading: string
  description: string
  desktopImage: string | null
  mobileImage: string | null
  ctaText: string | null
  ctaLink: string | null
  enabled: boolean
}

export type StorefrontVisual = {
  key: string
  title: string
  image: string | null
  mobileImage: string | null
  altText: string
  link: string | null
  enabled: boolean
}

type HeroFallback = Omit<StorefrontHero, "key" | "enabled">
type VisualFallback = Omit<StorefrontVisual, "key" | "enabled">

/**
 * Normalize a TCG / collection handle into the metaobject key prefix.
 * `one-piece` → `onepiece`, `pokemon` → `pokemon`.
 */
export function storefrontCmsKeyPrefix(handle: string): string {
  return handle.trim().toLowerCase().replace(/-/g, "")
}

/** Hero key for a known collection / merch page. */
export function heroKeyForCollection(
  collectionId: "pokemon" | "one-piece" | "preorders" | "new-releases"
): string {
  switch (collectionId) {
    case "pokemon":
      return "pokemon-hero"
    case "one-piece":
      return "onepiece-hero"
    case "preorders":
      return "preorders-hero"
    case "new-releases":
      return "new-releases-hero"
  }
}

/** Visual key for a language (or other) facet under a game handle. */
export function visualKeyForLanguageFacet(
  gameHandle: string,
  languageSlug: string
): string {
  return `${storefrontCmsKeyPrefix(gameHandle)}-${languageSlug.trim().toLowerCase()}`
}

/** Visual key for a homepage category card. */
export function visualKeyForHomepageCategory(
  category:
    | "pokemon"
    | "onepiece"
    | "preorders"
    | "accessories"
): string {
  return `homepage-category-${category}`
}

/**
 * Legacy placeholder hashes from pre-route CMS seeds.
 * Accessories has no storefront page yet — map to null (omit the CTA).
 */
const PLACEHOLDER_HREF_REWRITES: Record<string, string | null> = {
  "#pokemon": "/pokemon",
  "#one-piece": "/one-piece",
  "#accessories": null,
}

/** Rewrite known dead hash links; blank → null. */
export function normalizeStorefrontHref(
  href: string | null | undefined
): string | null {
  const trimmed = href?.trim()
  if (!trimmed) return null
  if (Object.prototype.hasOwnProperty.call(PLACEHOLDER_HREF_REWRITES, trimmed)) {
    return PLACEHOLDER_HREF_REWRITES[trimmed] ?? null
  }
  return trimmed
}

const HERO_FALLBACKS: Record<string, HeroFallback> = {
  homepage: {
    title: "Homepage",
    eyebrow: "Direct from Japan",
    heading: "Japanese Pokémon.\nSealed & Current.",
    description:
      "The newest Japanese Pokémon sets, factory-sealed and imported weekly — ready to ship from California.",
    desktopImage: "/products/mega-symphonia.webp",
    mobileImage: "/products/30th-celebration.webp",
    ctaText: "Shop Pokémon",
    ctaLink: "/pokemon",
  },
  "pokemon-hero": {
    title: COLLECTIONS.pokemon.title,
    eyebrow: "Direct from Japan",
    heading: "Japanese Pokémon.\nSealed & Current.",
    description: COLLECTIONS.pokemon.description,
    desktopImage: COLLECTIONS.pokemon.images[0]?.src ?? null,
    mobileImage: COLLECTIONS.pokemon.images[1]?.src ?? null,
    ctaText: "Shop Pokémon",
    ctaLink: "/pokemon",
  },
  "onepiece-hero": {
    title: COLLECTIONS["one-piece"].title,
    eyebrow: "Direct from Japan",
    heading: "One Piece TCG.\nStraight from Bandai.",
    description: COLLECTIONS["one-piece"].description,
    desktopImage: COLLECTIONS["one-piece"].images[0]?.src ?? null,
    mobileImage: COLLECTIONS["one-piece"].images[1]?.src ?? null,
    ctaText: "Shop One Piece",
    ctaLink: "/one-piece",
  },
  "preorders-hero": {
    title: COLLECTIONS.preorders.title,
    eyebrow: "Direct from Japan",
    heading: "Upcoming Drops.\nReserve Early.",
    description: COLLECTIONS.preorders.description,
    desktopImage: COLLECTIONS.preorders.images[1]?.src ?? null,
    mobileImage: COLLECTIONS.preorders.images[0]?.src ?? null,
    ctaText: "View Preorders",
    ctaLink: "/preorders",
  },
  "new-releases-hero": {
    title: COLLECTIONS["new-releases"].title,
    eyebrow: "Direct from Japan",
    heading: "Newest Arrivals.\nReady to Ship.",
    description: COLLECTIONS["new-releases"].description,
    desktopImage: COLLECTIONS["new-releases"].images[1]?.src ?? null,
    mobileImage: COLLECTIONS["new-releases"].images[0]?.src ?? null,
    ctaText: "Shop New Releases",
    ctaLink: "/new-releases",
  },
  "accessories-hero": {
    title: "Accessories",
    eyebrow: "Direct from Japan",
    heading: "Binders & Storage.\nReady for Your Collection.",
    description:
      "Official binders, cases, and storage for Japanese TCG collections.",
    desktopImage: "/products/official-9-pocket-binder-vol-1.webp",
    mobileImage: null,
    ctaText: "Shop Accessories",
    // No /accessories page yet — omit CTA rather than a dead hash.
    ctaLink: null,
  },
}

const VISUAL_FALLBACKS: Record<string, VisualFallback> = {
  "pokemon-japanese": {
    title: "Japanese",
    image: "/products/mega-symphonia.webp",
    mobileImage: null,
    altText: "Japanese Pokémon sealed product",
    link: "/pokemon/japanese",
  },
  "pokemon-english": {
    title: "English",
    image: "/products/white-flare.webp",
    mobileImage: null,
    altText: "English Pokémon sealed product",
    link: "/pokemon/english",
  },
  "pokemon-chinese": {
    title: "Chinese",
    image: "/products/30th-celebration.webp",
    mobileImage: null,
    altText: "Chinese Pokémon sealed product",
    link: "/pokemon/chinese",
  },
  "pokemon-korean": {
    title: "Korean",
    image: "/products/battle-partners.webp",
    mobileImage: null,
    altText: "Korean Pokémon sealed product",
    link: "/pokemon/korean",
  },
  "onepiece-japanese": {
    title: "Japanese",
    image: "/products/awakening-of-the-new-era.webp",
    mobileImage: null,
    altText: "Japanese One Piece sealed product",
    link: "/one-piece/japanese",
  },
  "onepiece-english": {
    title: "English",
    image: "/products/emperors-in-the-new-world.webp",
    mobileImage: null,
    altText: "English One Piece sealed product",
    link: "/one-piece/english",
  },
  "accessories-card": {
    title: "Accessories",
    image: "/products/official-9-pocket-binder-vol-1.webp",
    mobileImage: null,
    altText: "Official TCG binder accessory",
    // No /accessories page yet — omit link rather than a dead hash.
    link: null,
  },
  "sealed-cases-card": {
    title: "Sealed Cases",
    image: "/products/mega-symphonia.webp",
    mobileImage: null,
    altText: "Sealed TCG case",
    link: "/pokemon",
  },
  "homepage-category-pokemon": {
    title: "Pokémon TCG",
    image: "/products/mega-symphonia.webp",
    mobileImage: null,
    altText: "Japanese Pokémon sealed product",
    link: "/pokemon",
  },
  "homepage-category-onepiece": {
    title: "One Piece TCG",
    image: "/products/awakening-of-the-new-era.webp",
    mobileImage: null,
    altText: "Japanese One Piece sealed product",
    link: "/one-piece",
  },
  "homepage-category-preorders": {
    title: "Preorders",
    image: "/products/egghead-crisis.webp",
    mobileImage: null,
    altText: "Upcoming Japanese TCG preorder products",
    link: "/preorders",
  },
  "homepage-category-accessories": {
    title: "Accessories",
    image: "/products/official-9-pocket-binder-vol-1.webp",
    mobileImage: null,
    altText: "Official TCG binder accessory",
    // No /accessories page yet — omit from Shop by Category until it exists.
    link: null,
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

function fieldImageUrl(
  fields: Map<string, ShopifyMetaobjectField>,
  key: string
): string | null {
  const field = fields.get(key)
  const ref = field?.reference
  if (!ref || !("image" in ref)) return null
  const url = ref.image?.url?.trim()
  return url || null
}

function parseHero(node: ShopifyMetaobject): StorefrontHero | null {
  const fields = fieldMap(node.fields)
  const key = fieldText(fields, "key") || node.handle
  if (!key) return null

  return {
    key,
    // Collection pages use `title` (H1). Homepage carousel uses `heading`.
    title: fieldText(fields, "title") || key,
    eyebrow: fieldText(fields, "eyebrow") || "",
    heading: fieldText(fields, "heading") || "",
    description: fieldText(fields, "description") || "",
    desktopImage: fieldImageUrl(fields, "desktop_image"),
    mobileImage: fieldImageUrl(fields, "mobile_image"),
    ctaText: fieldText(fields, "cta_text"),
    ctaLink: fieldText(fields, "cta_link"),
    enabled: fieldBool(fields, "enabled", true),
  }
}

/** Parse a Storefront Hero metaobject node (used by Homepage orchestration). */
export function storefrontHeroFromMetaobject(
  node: ShopifyMetaobject
): StorefrontHero | null {
  return parseHero(node)
}

function parseVisual(node: ShopifyMetaobject): StorefrontVisual | null {
  const fields = fieldMap(node.fields)
  const key = fieldText(fields, "key") || node.handle
  if (!key) return null

  const imageRef = fields.get("image")?.reference
  const imageAlt =
    imageRef && imageRef.__typename === "MediaImage"
      ? imageRef.image?.altText
      : null
  const altText =
    fieldText(fields, "alt") ||
    fieldText(fields, "alt_text") ||
    imageAlt ||
    key
  const title = fieldText(fields, "title") || altText || key

  return {
    key,
    title,
    image: fieldImageUrl(fields, "image"),
    mobileImage: fieldImageUrl(fields, "mobile_image"),
    altText,
    link: fieldText(fields, "link"),
    // Visual definition has no `enabled` field; treat present entries as enabled.
    enabled: fieldBool(fields, "enabled", true),
  }
}

async function fetchAllMetaobjects(
  type: string
): Promise<ShopifyMetaobject[]> {
  const nodes: ShopifyMetaobject[] = []
  let after: string | null | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<MetaobjectsByTypeQueryResult>({
      query: GET_METAOBJECTS_BY_TYPE,
      variables: {
        type,
        first: 100,
        ...(after ? { after } : {}),
      },
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

/**
 * Load every Storefront Hero entry into a keyed map.
 * Deduped per request via React `cache`. Missing definitions yield `{}`.
 */
export const getStorefrontHeroMap = cache(
  async (): Promise<Map<string, StorefrontHero>> => {
    try {
      const nodes = await fetchAllMetaobjects(STOREFRONT_HERO_TYPE)
      const map = new Map<string, StorefrontHero>()
      for (const node of nodes) {
        const hero = parseHero(node)
        if (hero) map.set(hero.key, hero)
      }
      return map
    } catch (error) {
      if (
        error instanceof ShopifyClientError ||
        (error instanceof Error && /metaobject/i.test(error.message))
      ) {
        console.warn(
          "[storefront-cms] Failed to load Storefront Heroes — using local fallbacks.",
          error instanceof Error ? error.message : error
        )
        return new Map()
      }
      throw error
    }
  }
)

/**
 * Load every Storefront Visual entry into a keyed map.
 * Deduped per request via React `cache`. Missing definitions yield `{}`.
 */
export const getStorefrontVisualMap = cache(
  async (): Promise<Map<string, StorefrontVisual>> => {
    try {
      const nodes = await fetchAllMetaobjects(STOREFRONT_VISUAL_TYPE)
      const map = new Map<string, StorefrontVisual>()
      for (const node of nodes) {
        const visual = parseVisual(node)
        if (visual) map.set(visual.key, visual)
      }
      return map
    } catch (error) {
      if (
        error instanceof ShopifyClientError ||
        (error instanceof Error && /metaobject/i.test(error.message))
      ) {
        console.warn(
          "[storefront-cms] Failed to load Storefront Visuals — using local fallbacks.",
          error instanceof Error ? error.message : error
        )
        return new Map()
      }
      throw error
    }
  }
)

function mergeHero(
  key: string,
  remote: StorefrontHero | undefined,
  fallback: HeroFallback | undefined
): StorefrontHero {
  const base: HeroFallback = fallback ?? {
    title: key,
    eyebrow: "",
    heading: "",
    description: "",
    desktopImage: null,
    mobileImage: null,
    ctaText: null,
    ctaLink: null,
  }

  // Disabled or missing remote → full local fallback.
  if (!remote || !remote.enabled) {
    return {
      key,
      enabled: true,
      ...base,
      ctaLink: normalizeStorefrontHref(base.ctaLink),
    }
  }

  return {
    key,
    enabled: true,
    title:
      remote.title && remote.title !== key ? remote.title : base.title,
    eyebrow: remote.eyebrow || base.eyebrow,
    heading: remote.heading || base.heading,
    description: remote.description || base.description,
    desktopImage: remote.desktopImage || base.desktopImage,
    mobileImage: remote.mobileImage || base.mobileImage,
    ctaText: remote.ctaText || base.ctaText,
    ctaLink: normalizeStorefrontHref(remote.ctaLink || base.ctaLink),
  }
}

function mergeVisual(
  key: string,
  remote: StorefrontVisual | undefined,
  fallback: VisualFallback | undefined
): StorefrontVisual {
  const base: VisualFallback = fallback ?? {
    title: key,
    image: null,
    mobileImage: null,
    altText: key,
    link: null,
  }

  if (!remote || !remote.enabled) {
    return {
      key,
      enabled: true,
      ...base,
      link: normalizeStorefrontHref(base.link),
    }
  }

  return {
    key,
    enabled: true,
    title: remote.title || base.title,
    image: remote.image || base.image,
    mobileImage: remote.mobileImage || base.mobileImage,
    altText: remote.altText || base.altText,
    link: normalizeStorefrontHref(remote.link || base.link),
  }
}

/**
 * Resolve a Storefront Hero by key, merging Shopify values over local fallbacks.
 */
export async function getStorefrontHero(key: string): Promise<StorefrontHero> {
  const map = await getStorefrontHeroMap()
  return mergeHero(key, map.get(key), HERO_FALLBACKS[key])
}

/**
 * Resolve a Storefront Visual by key, merging Shopify values over local fallbacks.
 */
export async function getStorefrontVisual(
  key: string
): Promise<StorefrontVisual> {
  const map = await getStorefrontVisualMap()
  return mergeVisual(key, map.get(key), VISUAL_FALLBACKS[key])
}

/**
 * Overlay hero marketing assets onto a collection presentation.
 * Preserves atmosphere / layout classNames; only swaps copy + image URLs.
 *
 * When the Storefront Hero has Shopify file fields, collection pages render a
 * responsive pair: `desktop_image` (≥ sm) and `mobile_image` (< sm, falling
 * back to desktop). Local dual-product collage art is kept only when neither
 * Shopify image is set (or the hero is disabled).
 */
export async function applyStorefrontHeroToPresentation(
  heroKey: string,
  presentation: CollectionPresentation
): Promise<CollectionPresentation> {
  const map = await getStorefrontHeroMap()
  const remote = map.get(heroKey)
  const hero = mergeHero(heroKey, remote, HERO_FALLBACKS[heroKey])

  const shopifyDesktop =
    remote?.enabled && remote.desktopImage ? remote.desktopImage : null
  const shopifyMobile =
    remote?.enabled && remote.mobileImage ? remote.mobileImage : null
  const hasShopifyArt = Boolean(shopifyDesktop || shopifyMobile)

  let resolvedImages: CollectionHeroImage[]

  if (hasShopifyArt) {
    const desktopSrc = shopifyDesktop || shopifyMobile!
    const mobileSrc = shopifyMobile || shopifyDesktop!
    const layoutClass = resolveHeroLayoutClassName(presentation.images)

    resolvedImages = [
      {
        src: desktopSrc,
        alt: hero.title || presentation.title,
        className: layoutClass,
        media: "desktop",
      },
      {
        src: mobileSrc,
        alt: hero.title || presentation.title,
        className: layoutClass,
        media: "mobile",
      },
    ]
  } else if (presentation.images.length > 0) {
    // No Shopify art — keep the coded local collage untouched.
    resolvedImages = presentation.images.map((image) => ({ ...image }))
  } else if (hero.desktopImage) {
    // Dynamic TCG with no collage config still gets a single hero image.
    const layoutClass = resolveHeroLayoutClassName([])
    const mobileSrc = hero.mobileImage || hero.desktopImage
    resolvedImages = [
      {
        src: hero.desktopImage,
        alt: hero.title || presentation.title,
        className: layoutClass,
        media: "desktop",
      },
      {
        src: mobileSrc,
        alt: hero.title || presentation.title,
        className: layoutClass,
        media: "mobile",
      },
    ]
  } else {
    resolvedImages = []
  }

  return {
    ...presentation,
    title: hero.title || presentation.title,
    description: hero.description || presentation.description,
    images: resolvedImages,
  }
}

const DEFAULT_HERO_LAYOUT_CLASS =
  "absolute -right-[4%] top-1/2 h-[175%] w-auto -translate-y-1/2 rotate-3 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.55)] sm:h-[195%]"

/** Prefer the largest always-visible collage image as the layout anchor. */
function resolveHeroLayoutClassName(
  images: readonly CollectionHeroImage[]
): string {
  if (images.length === 0) return DEFAULT_HERO_LAYOUT_CLASS

  const scored = images.map((image) => {
    const match = image.className.match(/h-\[(\d+)%\]/)
    return { image, height: match ? Number(match[1]) : 0 }
  })
  scored.sort((a, b) => b.height - a.height)

  return stripVisibilityUtilities(scored[0]?.image.className ?? DEFAULT_HERO_LAYOUT_CLASS)
}

/** Remove show/hide utilities so CMS desktop/mobile classes can own visibility. */
function stripVisibilityUtilities(className: string): string {
  return className
    .replace(
      /\b(?:sm|md|lg|xl|2xl|max-sm|max-md|max-lg):(?:hidden|block|flex|inline|inline-block)\b/g,
      ""
    )
    .replace(/\bhidden\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Prefer a Storefront Visual image from Shopify when present.
 * Otherwise keep `current` (collection / product art).
 * Local coded fallbacks apply only when nothing else is available.
 */
export async function resolveVisualImage(
  key: string,
  current?: { url: string | null; alt: string | null }
): Promise<{ url: string | null; alt: string | null }> {
  const map = await getStorefrontVisualMap()
  const remote = map.get(key)

  if (remote && remote.enabled && remote.image) {
    return {
      url: remote.image,
      alt: remote.altText || current?.alt || remote.title,
    }
  }

  if (current?.url) {
    return {
      url: current.url,
      alt: current.alt ?? null,
    }
  }

  const fallback = await getStorefrontVisual(key)
  return {
    url: fallback.image,
    alt: fallback.altText || fallback.title,
  }
}

/** Serializable homepage hero slide for the client carousel. */
export type HomepageHeroSlide = {
  id: string
  eyebrow: string
  /** Plain heading; use `\n` for a line break. Second line renders in green. */
  heading: string
  description: string
  primary: { label: string; href: string }
  secondary: { label: string; href: string }
  glow: string
  /** From Storefront Hero `desktop_image` (local fallback when missing). */
  desktopImage: string
  /** From Storefront Hero `mobile_image` (falls back to desktop). */
  mobileImage: string
  imageAlt: string
  /** Fixed layout slot for the hero product art (unchanged per slide). */
  imageClassName: string
}

const HOMEPAGE_SLIDE_DEFS: Array<{
  id: string
  heroKey: string
  secondary: { label: string; href: string }
  glow: string
  /** Dominant float slot from the previous collage (layout preserved). */
  imageClassName: string
}> = [
  {
    id: "pokemon",
    heroKey: "pokemon-hero",
    secondary: { label: "Browse Catalog", href: "/pokemon" },
    glow: "rgba(255,255,255,0.55)",
    // Mobile preserved. sm+ fills the art slot; Hero CSS sizes by height so the full scene shows.
    imageClassName:
      "absolute right-[2%] top-[2%] z-10 w-[72%] sm:inset-y-0 sm:right-0 sm:left-0 sm:top-0 sm:h-full sm:w-full",
  },
  {
    id: "onepiece",
    heroKey: "onepiece-hero",
    secondary: { label: "View All Sets", href: "/one-piece" },
    glow: "rgba(255,255,255,0.5)",
    imageClassName:
      "absolute right-[0%] top-[0%] z-10 w-[70%] sm:inset-y-0 sm:right-0 sm:left-0 sm:top-0 sm:h-full sm:w-full",
  },
  {
    id: "preorders",
    heroKey: "preorders-hero",
    secondary: { label: "Shop New Releases", href: "/new-releases" },
    glow: "rgba(255,255,255,0.48)",
    imageClassName:
      "absolute right-[0%] top-[-2%] z-10 w-[68%] sm:inset-y-0 sm:right-0 sm:left-0 sm:top-0 sm:h-full sm:w-full",
  },
]

const DEFAULT_HOMEPAGE_SLIDE_PRESENTATION = {
  secondary: { label: "Browse Catalog", href: "/products" },
  glow: "rgba(255,255,255,0.5)",
  imageClassName:
    "absolute right-[2%] top-[2%] z-10 w-[72%] sm:inset-y-0 sm:right-0 sm:left-0 sm:top-0 sm:h-full sm:w-full",
} as const

/**
 * Build a carousel slide from a resolved Storefront Hero.
 * Uses known slide presentation when the hero key matches a carousel def.
 */
export function homepageHeroSlideFromHero(
  hero: StorefrontHero
): HomepageHeroSlide {
  const def = HOMEPAGE_SLIDE_DEFS.find((entry) => entry.heroKey === hero.key)
  const presentation = def ?? {
    id: hero.key,
    ...DEFAULT_HOMEPAGE_SLIDE_PRESENTATION,
  }

  const desktopImage =
    hero.desktopImage || HERO_FALLBACKS[hero.key]?.desktopImage || ""
  const mobileImage =
    hero.mobileImage ||
    hero.desktopImage ||
    HERO_FALLBACKS[hero.key]?.mobileImage ||
    desktopImage

  return {
    id: presentation.id,
    eyebrow: hero.eyebrow,
    heading: hero.heading,
    description: hero.description,
    primary: {
      label: hero.ctaText || "Shop Now",
      href: normalizeStorefrontHref(hero.ctaLink) || "/",
    },
    secondary: presentation.secondary,
    glow: presentation.glow,
    desktopImage,
    mobileImage,
    imageAlt: hero.title || hero.heading || presentation.id,
    imageClassName: presentation.imageClassName,
  }
}

/**
 * Build homepage carousel slides from Storefront Heroes only.
 * Each slide’s copy + desktop/mobile art come from one metaobject.
 */
export async function getHomepageHeroSlides(): Promise<HomepageHeroSlide[]> {
  return Promise.all(
    HOMEPAGE_SLIDE_DEFS.map(async (def) => {
      const hero = await getStorefrontHero(def.heroKey)
      return homepageHeroSlideFromHero(hero)
    })
  )
}

export type HomepageCategoryCard = {
  title: string
  subtitle: string
  href: string
  atmosphere: string
  images: Array<{ src: string; alt: string; className: string }>
}

const HOMEPAGE_CATEGORY_DEFS: Array<{
  visualKey: string
  subtitle: string
  atmosphere: string
  fallbackHref: string
  imageClassName: string
  extraImages?: Array<{ src: string; alt: string; className: string }>
}> = [
  {
    visualKey: "homepage-category-pokemon",
    subtitle: "Japanese sealed sets",
    fallbackHref: "/pokemon",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_85%_15%,rgba(233,213,255,0.65)_0%,transparent_42%),radial-gradient(ellipse_at_15%_100%,rgba(126,34,206,0.45)_0%,transparent_48%),linear-gradient(125deg,#2e1065_0%,#6b21a8_40%,#a21caf_100%)]",
    imageClassName:
      "absolute -right-[10%] top-1/2 h-[195%] w-auto -translate-y-1/2 rotate-3 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)]",
  },
  {
    visualKey: "homepage-category-onepiece",
    subtitle: "Bandai sealed product",
    fallbackHref: "/one-piece",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_85%_10%,rgba(254,215,170,0.6)_0%,transparent_42%),radial-gradient(ellipse_at_10%_95%,rgba(185,28,28,0.55)_0%,transparent_48%),linear-gradient(125deg,#7f1d1d_0%,#c2410c_42%,#ea580c_100%)]",
    imageClassName:
      "absolute -right-[10%] top-1/2 h-[195%] w-auto -translate-y-1/2 -rotate-2 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)]",
  },
  {
    visualKey: "homepage-category-preorders",
    subtitle: "Upcoming releases",
    fallbackHref: "/preorders",
    atmosphere:
      "bg-[radial-gradient(ellipse_at_70%_30%,rgba(253,224,71,0.28)_0%,transparent_45%),linear-gradient(125deg,#020617_0%,#1e293b_48%,#334155_100%)]",
    imageClassName:
      "absolute -right-[12%] top-1/2 h-[180%] w-auto -translate-y-1/2 rotate-8 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)]",
    extraImages: [
      {
        src: "/products/30th-celebration.webp",
        alt: "",
        className:
          "absolute right-[16%] top-[48%] h-[150%] w-auto -translate-y-1/2 -rotate-10 object-contain opacity-75 drop-shadow-[0_20px_36px_rgba(0,0,0,0.45)]",
      },
    ],
  },
  // Accessories omitted until /accessories exists (Shopify collection is ready;
  // hash CTAs were dead links). Re-add with href "/accessories" when the page ships.
]

/** Build homepage Shop by Category cards from Storefront Visuals. */
export async function getHomepageCategoryCards(): Promise<
  HomepageCategoryCard[]
> {
  const cards = await Promise.all(
    HOMEPAGE_CATEGORY_DEFS.map(async (def) => {
      const visual = await getStorefrontVisual(def.visualKey)
      const href = normalizeStorefrontHref(visual.link || def.fallbackHref)
      if (!href) return null

      const primary = {
        src: visual.image || "",
        alt: visual.altText || visual.title,
        className: def.imageClassName,
      }

      return {
        title: visual.title,
        subtitle: def.subtitle,
        href,
        atmosphere: def.atmosphere,
        images: [...(def.extraImages ?? []), primary],
      } satisfies HomepageCategoryCard
    })
  )

  return cards.filter((card): card is HomepageCategoryCard => card !== null)
}
