/**
 * Serialize / parse collection browse state for shareable URL query params.
 *
 * Params: sort, q, page, availability, type, year, language, priceMin, priceMax
 */

import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  type CollectionFiltersState,
  type SortOption,
} from "./collectionFilters"
import type { AvailabilityFilter } from "./productMeta"
import { PRODUCT_LANGUAGE_SLUGS } from "./productMeta"

export type CollectionUrlState = {
  sort: SortOption
  query: string
  page: number
  filters: CollectionFiltersState
}

type ReadonlyURLSearchParams = {
  get(name: string): string | null
}

const SORT_OPTIONS = new Set<SortOption>([
  "newest",
  "oldest",
  "price-asc",
  "price-desc",
  "alphabetical",
])

const AVAILABILITY = new Set<AvailabilityFilter>([
  "instock",
  "preorder",
  "coming-soon",
])

function parseList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

function parseAvailability(value: string | null): AvailabilityFilter[] {
  return parseList(value).filter((item): item is AvailabilityFilter =>
    AVAILABILITY.has(item as AvailabilityFilter)
  )
}

function parseYears(value: string | null): number[] {
  return parseList(value)
    .map((part) => Number.parseInt(part, 10))
    .filter((year) => Number.isFinite(year) && year >= 1990 && year <= 2100)
}

function parseLanguages(value: string | null): string[] {
  return parseList(value).filter((slug) =>
    (PRODUCT_LANGUAGE_SLUGS as readonly string[]).includes(slug.toLowerCase())
  ).map((slug) => slug.toLowerCase())
}

function parseSort(value: string | null): SortOption {
  if (!value) return DEFAULT_SORT
  // Legacy alias from earlier UI.
  if (value === "release-date") return "newest"
  if (SORT_OPTIONS.has(value as SortOption)) return value as SortOption
  return DEFAULT_SORT
}

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? "1", 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function parsePrice(value: string | null): number | null {
  if (value == null || value === "") return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function parseCollectionUrlState(
  params: URLSearchParams | ReadonlyURLSearchParams
): CollectionUrlState {
  return {
    sort: parseSort(params.get("sort")),
    query: params.get("q")?.trim() ?? "",
    page: parsePage(params.get("page")),
    filters: {
      availability: parseAvailability(params.get("availability")),
      types: parseList(params.get("type")),
      years: parseYears(params.get("year")),
      languages: parseLanguages(params.get("language")),
      priceMin: parsePrice(params.get("priceMin")),
      priceMax: parsePrice(params.get("priceMax")),
    },
  }
}

export function serializeCollectionUrlState(
  state: CollectionUrlState
): URLSearchParams {
  const params = new URLSearchParams()

  if (state.sort !== DEFAULT_SORT) {
    params.set("sort", state.sort)
  }

  const query = state.query.trim()
  if (query) {
    params.set("q", query)
  }

  if (state.page > 1) {
    params.set("page", String(state.page))
  }

  const { filters } = state

  if (filters.availability.length > 0) {
    params.set("availability", filters.availability.join(","))
  }

  if (filters.types.length > 0) {
    params.set("type", filters.types.join(","))
  }

  if (filters.years.length > 0) {
    params.set("year", filters.years.join(","))
  }

  if (filters.languages.length > 0) {
    params.set("language", filters.languages.join(","))
  }

  if (filters.priceMin != null) {
    params.set("priceMin", String(filters.priceMin))
  }

  if (filters.priceMax != null) {
    params.set("priceMax", String(filters.priceMax))
  }

  return params
}

export function collectionUrlSearch(
  state: CollectionUrlState
): string {
  const params = serializeCollectionUrlState(state)
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

export function collectionUrlStatesEqual(
  a: CollectionUrlState,
  b: CollectionUrlState
): boolean {
  return collectionUrlSearch(a) === collectionUrlSearch(b)
}

export { DEFAULT_FILTERS }
