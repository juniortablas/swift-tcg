/**
 * Plain-text helpers for meta descriptions and JSON-LD.
 */

/** Strip HTML tags and collapse whitespace for meta / schema text. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

/** Truncate at a word boundary for meta descriptions (Google ~155–160). */
export function truncateMeta(
  text: string,
  maxLength = 160
): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized

  const sliced = normalized.slice(0, maxLength - 1)
  const lastSpace = sliced.lastIndexOf(" ")
  const base = lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced
  return `${base.replace(/[.,;:!?-]+$/, "")}…`
}
