/**
 * Allowlist sanitizer for Shopify Online Store / policy HTML.
 * Strips scripts, event handlers, and unsafe URLs before storefront render.
 */

import * as cheerio from "cheerio"
import type { Element } from "domhandler"

const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
}

const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node as Element).type === "tag"
  )
}

/**
 * Sanitize Shopify rich-text / policy HTML for safe `dangerouslySetInnerHTML`.
 */
export function sanitizeShopifyHtml(html: string): string {
  const input = html?.trim()
  if (!input) return ""

  const $ = cheerio.load(input, null, false)

  $("script, style, iframe, object, embed, form, input, button, link, meta").remove()

  $("*").each((_, node) => {
    if (!isElement(node)) return

    const tag = node.tagName?.toLowerCase()
    if (!tag || !ALLOWED_TAGS.has(tag)) {
      $(node).replaceWith($(node).contents())
      return
    }

    const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>()
    const attribs = { ...node.attribs }

    for (const name of Object.keys(attribs)) {
      const lower = name.toLowerCase()
      if (lower.startsWith("on") || !allowed.has(lower)) {
        $(node).removeAttr(name)
        continue
      }

      if (lower === "href") {
        const href = attribs[name]?.trim() ?? ""
        if (!SAFE_HREF.test(href)) {
          $(node).removeAttr(name)
        } else if (/^https?:/i.test(href)) {
          $(node).attr("rel", "noopener noreferrer")
        }
      }

      if (lower === "target" && attribs[name] !== "_blank") {
        $(node).removeAttr(name)
      }
    }
  })

  return $.html()
}
