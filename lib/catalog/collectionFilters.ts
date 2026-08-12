import type { Product } from "@/types/product"

import { getProductReleaseDate } from "./homepage"
import {
  type AvailabilityFilter,
  getAvailability,
  getProductBrand,
  getProductLanguageSlug,
  getReleaseYear,
  getShopifyProductType,
  SHOPIFY_PRODUCT_TYPES,
} from "./productMeta"

export type SortOption =
  | "newest"
  | "oldest"
  | "price-asc"
  | "price-desc"
  | "alphabetical"

export type CollectionFiltersState = {
  availability: AvailabilityFilter[]
  priceMin: number | null
  priceMax: number | null
  /** Shopify `productType` values (e.g. "Booster Box"). */
  types: string[]
  years: number[]
  /** Language slugs: japanese, english, korean, chinese. */
  languages: string[]
}

export const DEFAULT_FILTERS: CollectionFiltersState = {
  availability: [],
  priceMin: null,
  priceMax: null,
  types: [],
  years: [],
  languages: [],
}

export const DEFAULT_SORT: SortOption = "newest"

export const PAGE_SIZE = 24

export function getPriceBounds(products: Product[]): { min: number; max: number } {
  const prices = products
    .map((product) => product.price)
    .filter((price): price is number => typeof price === "number")

  if (prices.length === 0) return { min: 0, max: 100 }

  return {
    min: Math.floor(Math.min(...prices)),
    max: Math.ceil(Math.max(...prices)),
  }
}

export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) return products

  return products.filter((product) =>
    [
      product.title,
      product.slug,
      product.category,
      product.productType,
      getProductBrand(product),
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(q))
  )
}

export function filterProducts(
  products: Product[],
  filters: CollectionFiltersState
): Product[] {
  const bounds = getPriceBounds(products)

  return products.filter((product) => {
    if (filters.availability.length > 0) {
      const availability = getAvailability(product)
      if (
        availability === "soldout" ||
        availability === "unknown" ||
        !filters.availability.includes(availability)
      ) {
        return false
      }
    }

    if (filters.types.length > 0) {
      const type = getShopifyProductType(product)
      if (!type || !filters.types.includes(type)) return false
    }

    if (filters.languages.length > 0) {
      const language = getProductLanguageSlug(product)
      if (!language || !filters.languages.includes(language)) return false
    }

    if (filters.years.length > 0) {
      const year = getReleaseYear(product)
      if (year == null || !filters.years.includes(year)) return false
    }

    if (product.price != null) {
      const min = filters.priceMin ?? bounds.min
      const max = filters.priceMax ?? bounds.max
      if (product.price < min || product.price > max) return false
    } else if (filters.priceMin != null || filters.priceMax != null) {
      // Unpriced items only pass when no explicit price bound is set.
      return false
    }

    return true
  })
}

/** Prefer `custom.release_date`, then Shopify `createdAt`. */
function releaseSortKey(product: Product): string {
  return (
    getProductReleaseDate(product) ??
    product.createdAt ??
    "1970-01-01T00:00:00Z"
  )
}

function compareByRelease(a: Product, b: Product, direction: "asc" | "desc"): number {
  const cmp = releaseSortKey(a).localeCompare(releaseSortKey(b))
  return direction === "desc" ? -cmp : cmp
}

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const next = [...products]

  switch (sort) {
    case "alphabetical":
      return next.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      )
    case "price-asc":
      return next.sort((a, b) => {
        if (a.price == null && b.price == null) return compareByRelease(a, b, "desc")
        if (a.price == null) return 1
        if (b.price == null) return -1
        if (a.price !== b.price) return a.price - b.price
        return compareByRelease(a, b, "desc")
      })
    case "price-desc":
      return next.sort((a, b) => {
        if (a.price == null && b.price == null) return compareByRelease(a, b, "desc")
        if (a.price == null) return 1
        if (b.price == null) return -1
        if (a.price !== b.price) return b.price - a.price
        return compareByRelease(a, b, "desc")
      })
    case "oldest":
      return next.sort((a, b) => compareByRelease(a, b, "asc"))
    case "newest":
    default:
      // Newest Release — primary sort on custom.release_date (DESC).
      return next.sort((a, b) => compareByRelease(a, b, "desc"))
  }
}

export function getAvailableYears(products: Product[]): number[] {
  const years = products
    .map(getReleaseYear)
    .filter((year): year is number => year != null)
  return Array.from(new Set(years)).sort((a, b) => b - a)
}

/** Distinct Shopify product types present in the catalog, data-standard order first. */
export function getAvailableTypes(products: Product[]): string[] {
  const present = new Set(
    products
      .map(getShopifyProductType)
      .filter((type): type is string => Boolean(type))
  )

  const ordered = SHOPIFY_PRODUCT_TYPES.filter((type) => present.has(type))
  const extras = Array.from(present)
    .filter((type) => !(SHOPIFY_PRODUCT_TYPES as readonly string[]).includes(type))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))

  return [...ordered, ...extras]
}

/** Distinct language slugs present in the catalog. */
export function getAvailableLanguages(products: Product[]): string[] {
  const present = new Set<string>()
  for (const product of products) {
    const language = getProductLanguageSlug(product)
    if (language) present.add(language)
  }

  return (["japanese", "english", "korean", "chinese"] as const).filter(
    (slug) => present.has(slug)
  )
}

export function hasActiveFilters(filters: CollectionFiltersState): boolean {
  return (
    filters.availability.length > 0 ||
    filters.types.length > 0 ||
    filters.years.length > 0 ||
    filters.languages.length > 0 ||
    filters.priceMin != null ||
    filters.priceMax != null
  )
}
