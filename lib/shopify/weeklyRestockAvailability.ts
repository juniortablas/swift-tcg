/**
 * Apply weekly restock reservation limits onto mapped storefront products.
 *
 * Remaining comes from `custom.current_weekly_reservations` already mapped
 * onto the product. Unreadable counters fail closed (Sold Out + Sentry).
 */

import type { Product } from "@/types/product"

import {
  captureWeeklyRestockFailure,
  remainingFromMappedProduct,
} from "./weeklyRestockReservations"

function failClosed(product: Product): Product {
  const limit = product.weeklyRestockLimit ?? 0
  return {
    ...product,
    status: "soldout",
    weeklyRestockRemaining: 0,
    weeklyRestockLimitReached: limit > 0,
  }
}

function applyOne(product: Product): Product {
  if (product.status !== "weekly_restock") return product

  const read = remainingFromMappedProduct(product)
  if (!read.ok) {
    captureWeeklyRestockFailure(
      new Error("weekly restock counter unreadable"),
      { productId: product.id }
    )
    return failClosed(product)
  }

  if (read.remaining <= 0) {
    return {
      ...product,
      status: "soldout",
      weeklyRestockRemaining: 0,
      weeklyRestockLimitReached: read.limit > 0,
    }
  }

  return {
    ...product,
    weeklyRestockRemaining: read.remaining,
  }
}

export async function applyWeeklyRestockLimits(
  products: Product[]
): Promise<Product[]> {
  try {
    return products.map(applyOne)
  } catch (error) {
    captureWeeklyRestockFailure(error, { count: products.length })
    return products.map((product) =>
      product.status === "weekly_restock" ? failClosed(product) : product
    )
  }
}

export async function applyWeeklyRestockLimit(
  product: Product | null
): Promise<Product | null> {
  if (!product) return null
  const [enriched] = await applyWeeklyRestockLimits([product])
  return enriched ?? product
}
