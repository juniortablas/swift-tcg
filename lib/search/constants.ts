/** Shared search UX constants. */

export const SEARCH_MIN_CHARS = 2
export const SEARCH_DEBOUNCE_MS = 180
export const SEARCH_RESULT_LIMIT = 8

export const POPULAR_SEARCHES = [
  "Booster Box",
  "Japanese",
  "One Piece",
  "Pokémon",
  "Preorder",
  "ETB",
] as const

export const POPULAR_CATEGORIES = [
  { label: "Pokémon", href: "/pokemon" },
  { label: "One Piece", href: "/one-piece" },
  { label: "New Releases", href: "/new-releases" },
  { label: "Preorders", href: "/preorders" },
] as const

export const RECENT_SEARCHES_KEY = "swift-tcg-recent-searches"
export const RECENT_SEARCHES_MAX = 6
