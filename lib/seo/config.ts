/**
 * Site-wide SEO configuration.
 *
 * Prefer SHOPIFY_APP_URL (the browsable HTTPS origin) so canonicals match OAuth
 * and production redirects. Falls back to NEXT_PUBLIC_SITE_URL, then apex.
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

const FALLBACK_ORIGIN = "https://swifttcg.com"

/**
 * Absolute public origin with no trailing slash.
 * Must match the host users actually browse (www vs apex).
 */
export function getSiteOrigin(): string {
  const raw =
    process.env.SHOPIFY_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    FALLBACK_ORIGIN

  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`)
    return url.origin
  } catch {
    return FALLBACK_ORIGIN
  }
}

/** Absolute URL for a path (leading slash optional). */
export function absoluteUrl(path = "/"): string {
  const origin = getSiteOrigin()
  if (!path || path === "/") return `${origin}/`
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${origin}${normalized}`
}
