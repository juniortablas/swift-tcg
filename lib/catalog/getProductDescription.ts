import type { Product } from "@/types/product"

export type ProductDescription = {
  shortDescription: string
  description: string
  paragraphs: string[]
  highlights: string[]
}

type ProductLike = Product & {
  releaseDate?: string | null
  contents?: string[] | null
}

function resolveProductType(product: ProductLike): string {
  const category = product.category.toLowerCase()

  if (category.includes("pokémon") || category.includes("pokemon")) {
    return "Pokémon TCG"
  }

  if (category.includes("one piece")) {
    return "One Piece Card Game"
  }

  return product.category
}

/**
 * Strip HTML tags from a description to get plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Build product description preferring real Shopify content.
 * Falls back to neutral product-only copy without company marketing.
 */
export function getProductDescription(product: ProductLike): ProductDescription {
  const productType = resolveProductType(product)

  // Prefer Shopify description (plain text or stripped HTML)
  let descriptionText = ""
  if (product.description?.trim()) {
    descriptionText = product.description.trim()
  } else if (product.descriptionHtml?.trim()) {
    descriptionText = stripHtml(product.descriptionHtml)
  }

  // If we have a Shopify description, use it
  if (descriptionText) {
    // Use first sentence or paragraph for short description
    const firstSentence = descriptionText.split(/[.!?]\s+/)[0]
    const shortDescription = firstSentence
      ? `${firstSentence}.`.replace(/\.\.$/, ".")
      : descriptionText.substring(0, 150)

    return {
      shortDescription,
      description: descriptionText,
      paragraphs: descriptionText.split(/\n\n+/).filter(Boolean),
      highlights: buildHighlights(product),
    }
  }

  // Fallback to neutral product-only description
  const shortDescription = `${product.title} — ${productType}.`

  return {
    shortDescription,
    description: shortDescription,
    paragraphs: [shortDescription],
    highlights: buildHighlights(product),
  }
}

/**
 * Build highlights from product facts only (no company marketing).
 */
function buildHighlights(product: ProductLike): string[] {
  const highlights: string[] = []

  if (product.releaseDate) {
    highlights.push(`Official Japanese Release: ${product.releaseDate}`)
  }

  if (Array.isArray(product.contents)) {
    for (const item of product.contents) {
      if (typeof item === "string" && item.trim()) {
        highlights.push(item.trim())
      }
    }
  }

  return highlights
}
