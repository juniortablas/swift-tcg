/**
 * Site-wide SEO configuration.
 *
 * Canonical public origin is always https://www.swifttcg.com.
 * The apex host redirects to www in production — SEO helpers never emit apex.
 * Non-production hosts (localhost, tunnels, Vercel previews) keep their own
 * origin so OAuth / previews still work.
 */

export const SITE_NAME = "Swift TCG"

export const DEFAULT_TITLE =
  "Swift TCG | Japanese Pokémon & One Piece Trading Cards"

export const DEFAULT_DESCRIPTION =
  "Shop authentic Japanese Pokémon and One Piece trading cards. Factory sealed booster boxes, premium collections, weekly imports, and official products shipped from the USA."

export const DEFAULT_OG_IMAGE = "/brand/swift-tcg-logo.png"

export const DEFAULT_KEYWORDS = [
  "Japanese Pokémon cards",
  "One Piece TCG",
  "Japanese trading cards",
  "Pokémon TCG Japan",
  "One Piece Card Game",
  "factory sealed booster boxes",
  "Japanese TCG imports",
  "Swift TCG",
] as const

/** Brand chrome / browser UI color (matches storefront white surfaces). */
export const THEME_COLOR = "#ffffff"

/** Single canonical production origin (no trailing slash). */
export const CANONICAL_ORIGIN = "https://www.swifttcg.com"

/** Hostname only — for robots.txt `Host:`. */
export const CANONICAL_HOST = "www.swifttcg.com"

/**
 * Normalize any swifttcg.com host (apex or www) to the www canonical.
 * Leaves localhost / preview / tunnel hosts unchanged.
 */
function normalizeSiteOrigin(raw: string): string {
  const withProtocol = raw.includes("://") ? raw : `https://${raw}`
  const url = new URL(withProtocol)
  const host = url.hostname.toLowerCase()

  if (host === "swifttcg.com" || host === "www.swifttcg.com") {
    return CANONICAL_ORIGIN
  }

  return url.origin
}

/**
 * Absolute public origin with no trailing slash.
 *
 * Resolution order:
 * 1. SHOPIFY_APP_URL
 * 2. NEXT_PUBLIC_SITE_URL
 * 3. CANONICAL_ORIGIN (www)
 *
 * Any apex/www swifttcg.com value is forced to https://www.swifttcg.com so
 * canonicals, OG, JSON-LD, sitemap, and robots never split across hosts.
 */
export function getSiteOrigin(): string {
  const raw =
    process.env.SHOPIFY_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    CANONICAL_ORIGIN

  try {
    return normalizeSiteOrigin(raw)
  } catch {
    return CANONICAL_ORIGIN
  }
}

/** Absolute URL for a path (leading slash optional). */
export function absoluteUrl(path = "/"): string {
  const origin = getSiteOrigin()
  if (!path || path === "/") return `${origin}/`
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${origin}${normalized}`
}
