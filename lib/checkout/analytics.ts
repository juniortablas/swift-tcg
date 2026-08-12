"use client"

/**
 * Shop Pay GA4 events. Custom names so they never collide with built-in
 * ecommerce hits (`begin_checkout`, `add_to_cart`, `page_view`, …).
 */

export type ShopPayPlacement = "product" | "cart"

type GtagFn = (...args: unknown[]) => void

function gtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined
  return window.gtag
}

const viewedPlacements = new Set<ShopPayPlacement>()

export function trackShopPayButtonViewed(placement: ShopPayPlacement): void {
  if (viewedPlacements.has(placement)) return
  viewedPlacements.add(placement)
  gtag()?.("event", "shop_pay_button_viewed", {
    event_category: "shop_pay",
    shop_pay_placement: placement,
  })
}

export function trackShopPayClicked(placement: ShopPayPlacement): void {
  gtag()?.("event", "shop_pay_clicked", {
    event_category: "shop_pay",
    shop_pay_placement: placement,
  })
}

export function trackShopPayCheckoutStarted(placement: ShopPayPlacement): void {
  gtag()?.("event", "shop_pay_checkout_started", {
    event_category: "shop_pay",
    shop_pay_placement: placement,
  })
}
