/**
 * Map Shopify Storefront shapes onto the app `Product` model.
 *
 * React components continue to consume `@/types/product` only.
 */

import { isProductTypeLabel } from "@/lib/catalog/productMeta"
import type { Product as AppProduct, ProductStatus } from "@/types/product"
import type { Product as ShopifyProduct } from "./types"

export type MapShopifyProductOptions = {
  /** Fallback game category when tags/title do not identify a TCG. */
  category?: string
}

function parsePrice(amount: string | undefined): number | null {
  if (amount == null || amount === "") return null
  const value = Number.parseFloat(amount)
  return Number.isFinite(value) ? value : null
}

function mapStatus(product: ShopifyProduct): ProductStatus {
  const tags = product.tags.map((tag) => tag.toLowerCase())

  // Workflow tags (ready-to-release, release-approved, released) are ignored —
  // storefront availability only changes when the `preorder` tag is removed.
  if (tags.includes("preorder") || tags.includes("pre-order")) {
    return "preorder"
  }

  if (!product.availableForSale) {
    return "soldout"
  }

  return "instock"
}

/**
 * Resolve the game/franchise category for storefront display.
 * Never uses Shopify `productType` (Booster Box, Binder, …) — that is a
 * product type, not a brand or TCG category.
 */
function inferCategory(
  product: ShopifyProduct,
  fallback?: string
): string {
  const haystack = [
    ...product.tags,
    product.vendor,
    product.title,
    product.handle,
  ]
    .join(" ")
    .toLowerCase()

  if (
    haystack.includes("one piece") ||
    haystack.includes("one-piece") ||
    haystack.includes("onepiece")
  ) {
    return "One Piece TCG"
  }

  if (haystack.includes("pokemon") || haystack.includes("pokémon")) {
    return "Pokémon TCG"
  }

  if (fallback?.trim()) return fallback.trim()

  const vendor = product.vendor?.trim()
  if (vendor && !isProductTypeLabel(vendor)) {
    return /\btcg\b/i.test(vendor) ? vendor : `${vendor} TCG`
  }

  return "unknown"
}

/**
 * Convert a Shopify Storefront product into the storefront `Product` model.
 */
export function mapShopifyProduct(
  product: ShopifyProduct,
  options: MapShopifyProductOptions = {}
): AppProduct {
  const slug = product.handle
  const vendor = product.vendor?.trim() || null
  const releaseDate = product.releaseDate?.value?.trim() || null

  return {
    id: product.id,
    slug,
    title: product.title,
    category: inferCategory(product, options.category),
    image: product.featuredImage?.url ?? "",
    price: parsePrice(product.priceRange.minVariantPrice.amount),
    url: `/products/${slug}`,
    status: mapStatus(product),
    vendor,
    tags: product.tags ?? [],
    releaseDate,
  }
}

/**
 * Map a list of Shopify products into app products.
 */
export function mapShopifyProducts(
  products: ShopifyProduct[],
  options: MapShopifyProductOptions = {}
): AppProduct[] {
  return products.map((product) => mapShopifyProduct(product, options))
}
