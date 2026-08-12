"use client"

import type { PredictiveSearchPayload } from "@/lib/shopify/predictiveSearchTypes"
import {
  getCachedSearch,
  getInflightSearch,
  setCachedSearch,
  setInflightSearch,
} from "@/lib/search/cache"
import { SEARCH_RESULT_LIMIT } from "@/lib/search/constants"

export async function fetchPredictiveSearch(
  query: string,
  signal?: AbortSignal,
  limit = SEARCH_RESULT_LIMIT
): Promise<PredictiveSearchPayload> {
  const term = query.trim()
  const cached = getCachedSearch(term, limit)
  if (cached) return cached

  const existing = getInflightSearch(term, limit)
  if (existing) return existing

  const request = (async () => {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(term)}&limit=${limit}`,
      { signal, headers: { Accept: "application/json" } }
    )
    if (!response.ok) {
      throw new Error(`Search failed (${response.status})`)
    }
    const payload = (await response.json()) as PredictiveSearchPayload
    setCachedSearch(term, limit, payload)
    return payload
  })()

  setInflightSearch(term, limit, request)
  return request
}
