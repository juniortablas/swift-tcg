/**
 * Predictive search result types for the storefront search API + dialog.
 */

import type { Product } from "@/types/product"

export type SearchCollectionHit = {
  id: string
  handle: string
  title: string
  url: string
  image: string | null
}

export type SearchPageHit = {
  id: string
  handle: string
  title: string
  url: string
}

export type SearchQuerySuggestion = {
  text: string
}

export type PredictiveSearchPayload = {
  products: Product[]
  collections: SearchCollectionHit[]
  pages: SearchPageHit[]
  queries: SearchQuerySuggestion[]
  /** Which backend path produced the payload. */
  source: "predictive" | "fallback"
}

export type PredictiveSearchQueryResult = {
  predictiveSearch: {
    products: Array<{
      id: string
      handle: string
      title: string
      productType: string
      vendor: string
      tags: string[]
      availableForSale: boolean
      totalInventory?: number | null
      createdAt?: string | null
      allowWeeklyRestock?: { value?: string | null } | null
      weeklyRestockLimit?: { value?: string | null } | null
      currentWeeklyReservations?: { value?: string | null } | null
      releaseDate?: { value?: string | null } | null
      language?: { value?: string | null } | null
      reviewRating?: { value?: string | null } | null
      reviewCount?: { value?: string | null } | null
      featuredImage: {
        url: string
        altText: string | null
        width?: number | null
        height?: number | null
      } | null
      priceRange: {
        minVariantPrice: { amount: string; currencyCode: string }
      }
    }>
    collections: Array<{
      id: string
      handle: string
      title: string
      image: { url: string; altText: string | null } | null
    }>
    pages: Array<{
      id: string
      handle: string
      title: string
    }>
    queries: Array<{
      text: string
      styledText?: string | null
    }>
  } | null
}
