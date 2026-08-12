/**
 * Map Shopify Storefront shapes onto the app `Product` model.
 *
 * React components continue to consume `@/types/product` only.
 */

import { isProductTypeLabel } from "@/lib/catalog/productMeta"
import { parseBreakdown } from "@/lib/reviews/constants"
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

function metafieldValue(
  field: { value?: string | null } | null | undefined
): string | null {
  const value = field?.value?.trim()
  return value ? value : null
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
  const productType = product.productType?.trim() || null
  const releaseDate = metafieldValue(product.releaseDate)
  const descriptionHtml = product.descriptionHtml?.trim() || null
  const language = metafieldValue(product.language)
  const series = metafieldValue(product.series)
  const condition = metafieldValue(product.condition)
  const rarity = metafieldValue(product.rarity)
  const productCode = metafieldValue(product.productCode)
  const reviewRatingRaw = metafieldValue(product.reviewRating)
  const reviewCountRaw = metafieldValue(product.reviewCount)
  const reviewRating = reviewRatingRaw
    ? Number.parseFloat(reviewRatingRaw)
    : null
  const reviewCount = reviewCountRaw
    ? Number.parseInt(reviewCountRaw, 10)
    : null
  const breakdownRaw = metafieldValue(product.reviewBreakdown)
  const reviewBreakdown = breakdownRaw ? parseBreakdown(breakdownRaw) : null
  const seoTitle = product.seo?.title?.trim() || null
  const seoDescription = product.seo?.description?.trim() || null
  const description = product.description?.trim() || null
  const imageAlt = product.featuredImage?.altText?.trim() || null
  const currencyCode =
    product.priceRange.minVariantPrice.currencyCode?.trim() || null

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
    productType,
    tags: product.tags ?? [],
    releaseDate,
    createdAt: product.createdAt || null,
    ...(descriptionHtml ? { descriptionHtml } : {}),
    ...(description ? { description } : {}),
    ...(seoTitle ? { seoTitle } : {}),
    ...(seoDescription ? { seoDescription } : {}),
    ...(imageAlt ? { imageAlt } : {}),
    ...(currencyCode ? { currencyCode } : {}),
    ...(language ? { language } : {}),
    ...(series ? { series } : {}),
    ...(condition ? { condition } : {}),
    ...(rarity ? { rarity } : {}),
    ...(productCode ? { productCode } : {}),
    ...(reviewRating != null && Number.isFinite(reviewRating)
      ? { reviewRating }
      : {}),
    ...(reviewCount != null && Number.isFinite(reviewCount)
      ? { reviewCount }
      : {}),
    ...(reviewBreakdown ? { reviewBreakdown } : {}),
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
