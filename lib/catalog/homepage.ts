import type { Product } from "@/types/product"

/** Known Japanese release dates for upcoming / preorder SKUs. */
const RELEASE_DATES: Record<string, string> = {
  "30th-celebration-card-set-bulbasaur-charmander-squirtle": "2026-10-16",
  "30th-celebration-futuristic-box": "2026-09-16",
  "30th-celebration-premium-deck-set-espeon-umbreon": "2026-09-16",
  "30th-celebration": "2026-09-16",
  "the-world-s-strongest-warriors-case-ships-on-august-19": "2026-08-19",
  "the-world-s-strongest-warriors-case-ships-on-august-20": "2026-08-20",
  "the-world-s-strongest-warriors-case-ships-on-august-21": "2026-08-21",
  "the-world-s-strongest-warriors-case-ships-on-august-24": "2026-08-24",
}

const MONTHS: Record<string, string> = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
}

/** Parse "Ships on August 19" style dates from titles/slugs when no ISO date exists. */
function parseShipDate(product: Product): string | null {
  const source = `${product.title} ${product.slug}`
  const match = source.match(
    /ships\s+on\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i
  )
  if (!match) return null

  const month = MONTHS[match[1].toLowerCase()]
  const day = match[2].padStart(2, "0")
  if (!month) return null

  // Ship windows in the current catalog are for the current storefront year.
  return `2026-${month}-${day}`
}

/**
 * Resolve a product release / ship date for badges and filters.
 * Prefers `product.releaseDate`, then a known-slug map, then title/slug parsing.
 */
export function getProductReleaseDate(product: Product): string | null {
  if (typeof product.releaseDate === "string" && product.releaseDate) {
    return product.releaseDate
  }
  return RELEASE_DATES[product.slug] ?? parseShipDate(product)
}
