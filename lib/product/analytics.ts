"use client"

/**
 * Weekly restock GA4 events. Custom names so they never collide with
 * built-in ecommerce hits (`add_to_cart`, `begin_checkout`, …).
 */

type GtagFn = (...args: unknown[]) => void

function gtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined
  return window.gtag
}

const viewedProductIds = new Set<string>()

export function trackWeeklyRestockViewed(product: {
  id: string
  title?: string
}): void {
  if (viewedProductIds.has(product.id)) return
  viewedProductIds.add(product.id)
  gtag()?.("event", "weekly_restock_viewed", {
    event_category: "weekly_restock",
    item_id: product.id,
    item_name: product.title,
  })
}

export function trackWeeklyRestockReserved(product: {
  id: string
  title?: string
}): void {
  gtag()?.("event", "weekly_restock_reserved", {
    event_category: "weekly_restock",
    item_id: product.id,
    item_name: product.title,
  })
}

const limitReachedProductIds = new Set<string>()

export function trackWeeklyRestockLimitReached(product: {
  id: string
  title?: string
}): void {
  if (limitReachedProductIds.has(product.id)) return
  limitReachedProductIds.add(product.id)
  gtag()?.("event", "weekly_restock_limit_reached", {
    event_category: "weekly_restock",
    item_id: product.id,
    item_name: product.title,
  })
}
