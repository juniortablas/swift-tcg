import type { Product, ProductStatus } from "@/types/product"

import { getProductReleaseDate } from "./homepage"

export type ProductBrand = string

export type ProductTypeFilter =
  | "booster-boxes"
  | "starter-decks"
  | "premium-collections"
  | "accessories"
  | "cases"

export type AvailabilityFilter = "instock" | "preorder" | "coming-soon"

const TYPE_FILTER_LABELS: Record<ProductTypeFilter, string> = {
  "booster-boxes": "Booster Boxes",
  "starter-decks": "Starter Decks",
  "premium-collections": "Premium Collections",
  accessories: "Accessories",
  cases: "Cases",
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

/** Display label used on product specs / cards. */
export function getProductTypeLabel(product: Product): string {
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

export function getProductTypeFilter(product: Product): ProductTypeFilter | null {
  const label = getProductTypeLabel(product)

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
  if (product.status === "preorder") {
    if (variant === "card") return "Preorder"
    return "Preorder Now"
  }
  if (variant === "bag") return "Add to Bag"
  return "Add to Cart"
}
