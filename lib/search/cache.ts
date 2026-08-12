"use client"

import type { PredictiveSearchPayload } from "@/lib/shopify/predictiveSearchTypes"

const MAX_ENTRIES = 24

type CacheEntry = {
  payload: PredictiveSearchPayload
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function normalizeKey(query: string, limit: number): string {
  return `${query.trim().toLowerCase()}::${limit}`
}

export function getCachedSearch(
  query: string,
  limit: number
): PredictiveSearchPayload | null {
  const key = normalizeKey(query, limit)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  // LRU touch
  cache.delete(key)
  cache.set(key, entry)
  return entry.payload
}

export function setCachedSearch(
  query: string,
  limit: number,
  payload: PredictiveSearchPayload,
  ttlMs = 60_000
): void {
  const key = normalizeKey(query, limit)
  if (cache.has(key)) cache.delete(key)
  cache.set(key, { payload, expiresAt: Date.now() + ttlMs })

  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest == null) break
    cache.delete(oldest)
  }
}

/** In-flight dedupe — identical queries share one network request. */
const inflight = new Map<string, Promise<PredictiveSearchPayload>>()

export function getInflightSearch(
  query: string,
  limit: number
): Promise<PredictiveSearchPayload> | null {
  return inflight.get(normalizeKey(query, limit)) ?? null
}

export function setInflightSearch(
  query: string,
  limit: number,
  promise: Promise<PredictiveSearchPayload>
): void {
  const key = normalizeKey(query, limit)
  inflight.set(key, promise)
  void promise.finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key)
  })
}
