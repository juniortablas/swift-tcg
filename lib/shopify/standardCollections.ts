/**
 * Canonical Shopify collections from docs/SHOPIFY_DATA_STANDARD.md.
 *
 * Handles are the preferred match key. Titles are the fallback when a
 * merchant renamed the handle or Shopify slugified accents differently.
 * Missing collections are created automatically by the sync layer
 * (`ensureStandardCollections` / `ensureStandardCollectionInShopify`).
 */

export type StandardCollectionKind =
  | "primary"
  | "pokemon-language"
  | "one-piece-language"
  | "homepage"

export type StandardCollection = {
  /** Stable key used by resolver / assignment logic. */
  key: string
  /** Customer-facing collection title from the data standard. */
  title: string
  /** Preferred Shopify handle. */
  handle: string
  /** Alternate handles to try before falling back to title match. */
  handleAliases?: readonly string[]
  kind: StandardCollectionKind
}

export const STANDARD_COLLECTIONS: readonly StandardCollection[] = [
  // Primary
  {
    key: "pokemon",
    title: "Pokémon",
    handle: "pokemon",
    handleAliases: ["pokémon"],
    kind: "primary",
  },
  {
    key: "one-piece",
    title: "One Piece",
    handle: "one-piece",
    handleAliases: ["onepiece"],
    kind: "primary",
  },
  {
    key: "accessories",
    title: "Accessories",
    handle: "accessories",
    kind: "primary",
  },
  {
    key: "sealed-cases",
    title: "Sealed Cases",
    handle: "sealed-cases",
    handleAliases: ["cases", "booster-cases"],
    kind: "primary",
  },

  // Pokémon language
  {
    key: "pokemon-japanese",
    title: "Pokémon Japanese",
    handle: "pokemon-japanese",
    handleAliases: ["pokémon-japanese"],
    kind: "pokemon-language",
  },
  {
    key: "pokemon-english",
    title: "Pokémon English",
    handle: "pokemon-english",
    handleAliases: ["pokémon-english"],
    kind: "pokemon-language",
  },
  {
    key: "pokemon-korean",
    title: "Pokémon Korean",
    handle: "pokemon-korean",
    handleAliases: ["pokémon-korean"],
    kind: "pokemon-language",
  },
  {
    key: "pokemon-chinese",
    title: "Pokémon Chinese",
    handle: "pokemon-chinese",
    handleAliases: ["pokémon-chinese"],
    kind: "pokemon-language",
  },

  // One Piece language
  {
    key: "one-piece-japanese",
    title: "One Piece Japanese",
    handle: "one-piece-japanese",
    handleAliases: ["onepiece-japanese"],
    kind: "one-piece-language",
  },
  {
    key: "one-piece-english",
    title: "One Piece English",
    handle: "one-piece-english",
    handleAliases: ["onepiece-english"],
    kind: "one-piece-language",
  },

  // Homepage (status-driven auto-assign: preorders, coming-soon, new-arrivals;
  // Featured / Best Sellers / Sale stay merchant-managed)
  {
    key: "featured",
    title: "Featured",
    handle: "featured",
    kind: "homepage",
  },
  {
    key: "new-arrivals",
    title: "New Arrivals",
    handle: "new-arrivals",
    handleAliases: ["new-releases"],
    kind: "homepage",
  },
  {
    key: "preorders",
    title: "Preorders",
    handle: "preorders",
    handleAliases: ["pre-orders"],
    kind: "homepage",
  },
  {
    key: "coming-soon",
    title: "Coming Soon",
    handle: "coming-soon",
    kind: "homepage",
  },
  {
    key: "best-sellers",
    title: "Best Sellers",
    handle: "best-sellers",
    handleAliases: ["bestsellers"],
    kind: "homepage",
  },
  {
    key: "sale",
    title: "Sale",
    handle: "sale",
    kind: "homepage",
  },
] as const

const BY_KEY = new Map(
  STANDARD_COLLECTIONS.map((collection) => [collection.key, collection])
)

export function getStandardCollection(
  key: string
): StandardCollection | undefined {
  return BY_KEY.get(key)
}

/** Lowercase, strip accents — used for handle/title matching. */
export function normalizeCollectionLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}
