import type { Product, ProductStatus } from "@/types/product"

import {
  WEEKLY_RESTOCK_BADGE_LABEL,
  WEEKLY_RESTOCK_CTA_CARD_LABEL,
  WEEKLY_RESTOCK_CTA_LABEL,
} from "@/lib/product/constants"
import { isWeeklyRestockStatus } from "@/lib/product/weeklyRestock"

import { getProductReleaseDate } from "./homepage"

export type ProductBrand = string

export type ProductTypeFilter =
  | "booster-boxes"
  | "starter-decks"
  | "premium-collections"
  | "accessories"
  | "cases"

export type AvailabilityFilter = "instock" | "preorder" | "coming-soon"

/** Canonical Shopify product types from the data standard. */
export const SHOPIFY_PRODUCT_TYPES = [
  "Booster Box",
  "Booster Pack",
  "Starter Deck",
  "Premium Collection",
  "Collection Box",
  "Deck Box",
  "Sleeves",
  "Binder",
  "Playmat",
  "Case",
] as const

export type ShopifyProductType = (typeof SHOPIFY_PRODUCT_TYPES)[number]

/** Language slugs used in tags, metafields, and filter URLs. */
export const PRODUCT_LANGUAGE_SLUGS = [
  "japanese",
  "english",
  "korean",
  "chinese",
] as const

export type ProductLanguageSlug = (typeof PRODUCT_LANGUAGE_SLUGS)[number]

const LANGUAGE_LABELS: Record<ProductLanguageSlug, string> = {
  japanese: "Japanese",
  english: "English",
  korean: "Korean",
  chinese: "Chinese",
}

const TYPE_FILTER_LABELS: Record<ProductTypeFilter, string> = {
  "booster-boxes": "Booster Boxes",
  "starter-decks": "Starter Decks",
  "premium-collections": "Premium Collections",
  accessories: "Accessories",
  cases: "Cases",
}

/** Map Shopify `productType` → filter bucket (sync / coarse filters). */
const SHOPIFY_TYPE_TO_FILTER: Record<string, ProductTypeFilter> = {
  "booster box": "booster-boxes",
  "booster pack": "booster-boxes",
  "starter deck": "starter-decks",
  "premium collection": "premium-collections",
  "collection box": "premium-collections",
  "deck box": "accessories",
  sleeves: "accessories",
  binder: "accessories",
  playmat: "accessories",
  case: "cases",
  "booster case": "cases",
}

/** Map title-heuristic labels → Shopify product type names. */
const LABEL_TO_SHOPIFY_TYPE: Record<string, ShopifyProductType> = {
  "Booster Box": "Booster Box",
  "Starter Set": "Starter Deck",
  "Deck Set": "Starter Deck",
  "Premium Collection": "Premium Collection",
  "Card Set": "Premium Collection",
  Promo: "Premium Collection",
  Binder: "Binder",
  "Booster Case": "Case",
}

/** Shopify / display product-type labels — never treat as brands. */
const PRODUCT_TYPE_LABELS = new Set(
  [
    "booster box",
    "booster pack",
    "starter deck",
    "starter set",
    "deck set",
    "premium collection",
    "collection box",
    "deck box",
    "sleeves",
    "binder",
    "playmat",
    "case",
    "booster case",
    "promo",
    "card set",
    "sealed product",
  ].map((value) => value.toLowerCase())
)

export function isProductTypeLabel(value: string): boolean {
  return PRODUCT_TYPE_LABELS.has(value.trim().toLowerCase())
}

/**
 * Manufacturer / franchise brand for filters.
 * Never returns product types (Binder, Booster Box, Case, …).
 */
export function getProductBrand(product: Product): ProductBrand | null {
  const vendor = product.vendor?.trim()
  if (vendor && !isProductTypeLabel(vendor)) {
    return vendor
  }

  const category = product.category.toLowerCase()
  if (category.includes("pokémon") || category.includes("pokemon")) {
    return "Pokémon"
  }
  if (category.includes("one piece") || category.includes("onepiece")) {
    return "One Piece"
  }

  const cleaned = product.category.replace(/\s*TCG\s*$/i, "").trim()
  if (
    cleaned &&
    !isProductTypeLabel(cleaned) &&
    cleaned.toLowerCase() !== "unknown"
  ) {
    return cleaned
  }

  return null
}

/**
 * Display label used on product specs / cards.
 * Prefers Shopify `productType`, then title heuristics.
 */
export function getProductTypeLabel(product: Product): string {
  const shopifyType = getShopifyProductType(product)
  if (shopifyType) return shopifyType

  return inferProductTypeLabelFromTitle(product)
}

function inferProductTypeLabelFromTitle(product: Product): string {
  const title = product.title.toLowerCase()

  if (title.includes("booster box") || /\[[a-z0-9-]+\]/i.test(product.title)) {
    if (title.includes("case")) return "Booster Case"
    if (title.includes("starter")) return "Starter Set"
    if (title.includes("premium") || title.includes("collection")) {
      return "Premium Collection"
    }
    if (title.includes("deck")) return "Deck Set"
    if (title.includes("binder")) return "Binder"
    if (title.includes("promo")) return "Promo"
    return "Booster Box"
  }

  if (title.includes("starter")) return "Starter Set"
  if (
    title.includes("premium") ||
    title.includes("collection") ||
    title.includes("celebration")
  ) {
    return "Premium Collection"
  }
  if (title.includes("deck")) return "Deck Set"
  if (title.includes("binder")) return "Binder"
  if (title.includes("promo") || title.includes("card set")) return "Card Set"
  if (title.includes("case")) return "Booster Case"

  return "Sealed Product"
}

/**
 * Shopify product type for collection filters.
 * Prefers Admin `productType`; falls back to a standard type inferred from title.
 */
export function getShopifyProductType(product: Product): string | null {
  const fromShopify = product.productType?.trim()
  if (fromShopify) return fromShopify

  const inferred = LABEL_TO_SHOPIFY_TYPE[inferProductTypeLabelFromTitle(product)]
  return inferred ?? null
}

/**
 * Coarse type bucket for sync tags / legacy callers.
 * Prefers Shopify `productType`, then title heuristics.
 */
export function getProductTypeFilter(product: Product): ProductTypeFilter | null {
  const shopifyType = product.productType?.trim().toLowerCase()
  if (shopifyType && SHOPIFY_TYPE_TO_FILTER[shopifyType]) {
    return SHOPIFY_TYPE_TO_FILTER[shopifyType]
  }

  const label = inferProductTypeLabelFromTitle(product)

  switch (label) {
    case "Booster Box":
      return "booster-boxes"
    case "Starter Set":
    case "Deck Set":
      return "starter-decks"
    case "Premium Collection":
    case "Card Set":
    case "Promo":
      return "premium-collections"
    case "Binder":
      return "accessories"
    case "Booster Case":
      return "cases"
    default:
      return null
  }
}

export function getTypeFilterLabel(filter: ProductTypeFilter): string {
  return TYPE_FILTER_LABELS[filter]
}

export function getAvailability(
  product: Product
): AvailabilityFilter | "soldout" | "unknown" {
  if (product.status === "soldout") return "soldout"
  if (product.price == null || product.price <= 0) return "coming-soon"
  if (product.status === "preorder") return "preorder"
  if (product.status === "instock") return "instock"
  return "unknown"
}

export function getReleaseYear(product: Product): number | null {
  const iso = getProductReleaseDate(product)
  if (!iso) return null
  const year = Number(iso.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

/**
 * Language slug from Shopify: prefer `custom.language`, else a known language tag.
 */
export function getProductLanguageSlug(
  product: Product
): ProductLanguageSlug | null {
  const fromMetafield = normalizeLanguageSlug(product.language)
  if (fromMetafield) return fromMetafield

  for (const tag of product.tags ?? []) {
    const fromTag = normalizeLanguageSlug(tag)
    if (fromTag) return fromTag
  }

  return null
}

/** Customer-facing language label (Japanese, English, …). */
export function getProductLanguageLabel(product: Product): string | null {
  const slug = getProductLanguageSlug(product)
  return slug ? LANGUAGE_LABELS[slug] : null
}

export function getLanguageFilterLabel(slug: string): string {
  const normalized = normalizeLanguageSlug(slug)
  if (normalized) return LANGUAGE_LABELS[normalized]
  if (!slug.trim()) return ""
  return slug.trim().replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeLanguageSlug(value: string | null | undefined): ProductLanguageSlug | null {
  if (!value) return null
  const key = value.trim().toLowerCase()
  if ((PRODUCT_LANGUAGE_SLUGS as readonly string[]).includes(key)) {
    return key as ProductLanguageSlug
  }
  return null
}

export function statusMatchesAvailability(
  status: ProductStatus,
  price: number | null,
  filter: AvailabilityFilter
): boolean {
  if (filter === "coming-soon") {
    return (price == null || price <= 0) && status !== "soldout"
  }
  if (filter === "preorder") {
    return status === "preorder" && price != null && price > 0
  }
  return status === "instock" && price != null && price > 0
}

/**
 * Whether a product can be added to the cart.
 * Sold out, unknown, and unpriced (Coming Soon) products are not purchasable.
 * Weekly restock reservations are paid cart adds (same checkout as in-stock).
 */
export function isPurchasable(product: Product): boolean {
  return (
    typeof product.price === "number" &&
    product.price > 0 &&
    product.status !== "soldout" &&
    product.status !== "unknown"
  )
}

export type PurchaseCtaVariant = "bag" | "cart" | "card"

/**
 * Primary purchase CTA label. Sold out / coming soon always win over add/preorder.
 */
export function getPurchaseCtaLabel(
  product: Product,
  variant: PurchaseCtaVariant = "cart"
): string {
  if (product.status === "soldout") return "Sold Out"
  if (product.price == null || product.price <= 0) return "Coming Soon"
  if (isWeeklyRestockStatus(product.status)) {
    return variant === "card"
      ? WEEKLY_RESTOCK_CTA_CARD_LABEL
      : WEEKLY_RESTOCK_CTA_LABEL
  }
  if (product.status === "preorder") {
    if (variant === "card") return "Preorder"
    return "Preorder Now"
  }
  if (variant === "bag") return "Add to Bag"
  return "Add to Cart"
}

export type AvailabilityBadge = {
  label: string
  className: string
}

export type AvailabilityBadgeSurface = "card" | "pdp"

const WEEKLY_RESTOCK_BADGE: AvailabilityBadge = {
  label: WEEKLY_RESTOCK_BADGE_LABEL,
  className: "bg-indigo-600/10 text-indigo-800",
}

const CARD_STATUS_BADGES: Partial<Record<ProductStatus, AvailabilityBadge>> = {
  instock: {
    label: "In Stock",
    className: "bg-indigo-600 text-white",
  },
  preorder: {
    label: "Preorder",
    className: "bg-black/[0.06] text-black/70",
  },
  weekly_restock: WEEKLY_RESTOCK_BADGE,
  soldout: {
    label: "Sold Out",
    className: "bg-neutral-500/10 text-neutral-500",
  },
}

const PDP_STATUS_BADGES: Partial<Record<ProductStatus, AvailabilityBadge>> = {
  instock: {
    label: "In Stock",
    className: "bg-indigo-600 text-white",
  },
  preorder: {
    label: "Preorder",
    className: "bg-blue-600 text-white",
  },
  weekly_restock: WEEKLY_RESTOCK_BADGE,
  soldout: {
    label: "Sold Out",
    className: "bg-neutral-500/15 text-neutral-500",
  },
}

const COMING_SOON_BADGE: AvailabilityBadge = {
  label: "Coming Soon",
  className: "bg-black/[0.06] text-black/55",
}

/**
 * Shared availability badge for cards, PDP, quick view, and search.
 * Coming Soon (unpriced) wins over every status except Sold Out.
 */
export function getAvailabilityBadge(
  product: Product,
  surface: AvailabilityBadgeSurface = "card"
): AvailabilityBadge | null {
  if (
    (product.price == null || product.price <= 0) &&
    product.status !== "soldout"
  ) {
    return COMING_SOON_BADGE
  }
  const badges = surface === "pdp" ? PDP_STATUS_BADGES : CARD_STATUS_BADGES
  return badges[product.status] ?? null
}
