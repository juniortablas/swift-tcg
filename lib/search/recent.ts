"use client"

import {
  RECENT_SEARCHES_KEY,
  RECENT_SEARCHES_MAX,
} from "@/lib/search/constants"

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, RECENT_SEARCHES_MAX)
  } catch {
    return []
  }
}

export function pushRecentSearch(term: string): string[] {
  const cleaned = term.trim()
  if (cleaned.length < 2) return readRecentSearches()

  const next = [
    cleaned,
    ...readRecentSearches().filter(
      (item) => item.toLowerCase() !== cleaned.toLowerCase()
    ),
  ].slice(0, RECENT_SEARCHES_MAX)

  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
  } catch {
    // Ignore quota / private mode.
  }
  return next
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // Ignore.
  }
}
