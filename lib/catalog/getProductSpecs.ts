import type { Product } from "@/types/product"

import { getProductReleaseDate } from "./homepage"
import { getProductBrand, getProductTypeLabel } from "./productMeta"

export type ProductSpec = {
  label: string
  value: string
}

function resolveManufacturer(product: Product): string {
  const brand = getProductBrand(product)
  if (brand === "Pokémon") return "The Pokémon Company"
  if (brand === "One Piece") return "Bandai"
  return "Official Japanese distributor"
}

function resolveSetCode(product: Product): string | null {
  const bracket = product.title.match(/\[([A-Z0-9-]+)\]/i)
  if (bracket?.[1]) return bracket[1].toUpperCase()

  const trailing = product.title.match(/\b([A-Z]{1,3}\d{1,3})\b/)
  if (trailing?.[1]) return trailing[1].toUpperCase()

  return null
}

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
 * Derive a clean specifications table from catalog fields.
 * Does not invent SKU-specific facts beyond shared storefront defaults.
 */
export function getProductSpecs(product: Product): ProductSpec[] {
  const brand = getProductBrand(product)
  const release = getProductReleaseDate(product)
  const setCode = resolveSetCode(product)

  const specs: ProductSpec[] = [
    { label: "Language", value: "Japanese" },
    { label: "Brand", value: brand ?? product.category },
    { label: "Condition", value: "Factory Sealed" },
  ]

  if (release) {
    specs.push({ label: "Release Date", value: formatReleaseDate(release) })
  }

  specs.push(
    { label: "Manufacturer", value: resolveManufacturer(product) },
    { label: "Product Type", value: getProductTypeLabel(product) }
  )

  if (setCode) {
    specs.push({ label: "Set Code", value: setCode })
  }

  return specs
}

/** Gallery sources — currently a single catalog image; ready for multi-image. */
export function getProductImages(product: Product): string[] {
  return product.image ? [product.image] : []
}
