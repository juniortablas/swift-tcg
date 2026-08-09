import type { Product } from "@/types/product"

import { getProductReleaseDate } from "./homepage"
import {
  type AvailabilityFilter,
  type ProductTypeFilter,
  getAvailability,
  getProductBrand,
  getProductTypeFilter,
  getReleaseYear,
} from "./productMeta"

export type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "release-date"
  | "alphabetical"

export type CollectionFiltersState = {
  availability: AvailabilityFilter[]
  priceMin: number | null
  priceMax: number | null
  types: ProductTypeFilter[]
  years: number[]
}

export const DEFAULT_FILTERS: CollectionFiltersState = {
  availability: [],
  priceMin: null,
  priceMax: null,
  types: [],
  years: [],
}

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
    [product.title, product.slug, product.category, getProductBrand(product)]
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
      const type = getProductTypeFilter(product)
      if (!type || !filters.types.includes(type)) return false
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

export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const next = [...products]

  switch (sort) {
    case "alphabetical":
      return next.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      )
    case "price-asc":
      return next.sort((a, b) => {
        if (a.price == null && b.price == null) return 0
        if (a.price == null) return 1
        if (b.price == null) return -1
        return a.price - b.price
      })
    case "price-desc":
      return next.sort((a, b) => {
        if (a.price == null && b.price == null) return 0
        if (a.price == null) return 1
        if (b.price == null) return -1
        return b.price - a.price
      })
    case "release-date":
      return next.sort((a, b) => {
        const aDate = getProductReleaseDate(a)
        const bDate = getProductReleaseDate(b)
        if (aDate && bDate) return bDate.localeCompare(aDate)
        if (aDate) return -1
        if (bDate) return 1
        return b.id.localeCompare(a.id)
      })
    case "newest":
    default:
      // Shopify collection / catalog order is already newest-first.
      return next
  }
}

export function getAvailableYears(products: Product[]): number[] {
  const years = products
    .map(getReleaseYear)
    .filter((year): year is number => year != null)
  return Array.from(new Set(years)).sort((a, b) => b - a)
}

export function getAvailableTypes(products: Product[]): ProductTypeFilter[] {
  const present = new Set(
    products
      .map(getProductTypeFilter)
      .filter((type): type is ProductTypeFilter => type != null)
  )

  return (
    [
      "booster-boxes",
      "starter-decks",
      "premium-collections",
      "accessories",
      "cases",
    ] as const
  ).filter((type) => present.has(type))
}
