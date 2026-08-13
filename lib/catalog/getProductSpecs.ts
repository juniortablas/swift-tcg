import type { Product } from "@/types/product"

import { getProductLanguageLabel } from "./productMeta"

export type ProductSpec = {
  label: string
  value: string
}

/** Tags that are organizational — never treat as Series / Set codes. */
const NON_SET_TAGS = new Set([
  "sora",
  "pokemon",
  "pokémon",
  "one-piece",
  "onepiece",
  "japanese",
  "english",
  "korean",
  "chinese",
  "preorder",
  "pre-order",
  "soldout",
  "sold-out",
  "coming-soon",
  "weekly-restock",
  "ready-to-release",
  "release-approved",
  "released",
  "booster-box",
  "starter-deck",
  "premium",
  "accessories",
  "case",
  "limited",
  "restock",
  "pokemon-center",
])

function formatReleaseDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Series / Set from Shopify: prefer `custom.series`, else a set-code tag.
 */
function resolveSeries(product: Product): string | null {
  if (product.series?.trim()) {
    return product.series.trim()
  }

  for (const tag of product.tags ?? []) {
    const normalized = tag.trim().toLowerCase()
    if (!normalized || NON_SET_TAGS.has(normalized)) continue
    // Set codes look like sv11b, op11, sv8a — short alphanumeric with digits.
    if (/^[a-z]{1,4}\d{1,4}[a-z0-9-]*$/i.test(normalized)) {
      return tag.trim().toUpperCase()
    }
  }

  return null
}

function pushSpec(
  specs: ProductSpec[],
  label: string,
  value: string | null | undefined
) {
  const trimmed = value?.trim()
  if (!trimmed) return
  specs.push({ label, value: trimmed })
}

/**
 * Build the PDP specifications table from Shopify product + metafield data.
 * Only includes rows with real values — nothing is invented or hardcoded.
 */
export function getProductSpecs(product: Product): ProductSpec[] {
  const specs: ProductSpec[] = []

  pushSpec(
    specs,
    "Release Date",
    product.releaseDate ? formatReleaseDate(product.releaseDate) : null
  )
  pushSpec(specs, "Language", getProductLanguageLabel(product))
  pushSpec(specs, "Series / Set", resolveSeries(product))
  pushSpec(specs, "Manufacturer", product.vendor)
  pushSpec(specs, "Product Type", product.productType)
  pushSpec(specs, "Condition", product.condition)
  pushSpec(specs, "Rarity", product.rarity)
  pushSpec(specs, "Product Code", product.productCode)

  return specs
}

/** Gallery sources — featured image first, then additional PDP images. */
export function getProductImages(product: Product): string[] {
  const urls = [
    product.image,
    ...(product.images ?? []),
  ].filter((url): url is string => Boolean(url))
  return [...new Set(urls)]
}
