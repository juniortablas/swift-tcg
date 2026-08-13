"use client"

/**
 * Newsletter GA4 events. Custom names so they never collide with built-in hits.
 */

import type { NewsletterSource } from "./types"

type GtagFn = (...args: unknown[]) => void

function gtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined
  return window.gtag
}

export function trackNewsletterSubscribed(placement: NewsletterSource): void {
  gtag()?.("event", "newsletter_subscribed", {
    event_category: "newsletter",
    placement,
  })
}
