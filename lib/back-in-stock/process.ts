/**
 * Cron processor: watch subscribed products, email when available, clear alerts.
 *
 * Duplicate-email prevention:
 * 1. Claim product subscribers via compareDigest clear (only one worker wins)
 * 2. Send email
 * 3. Remove from customer metafield
 * Failed sends are re-queued onto the product index so the next run retries.
 */

import { adminRemoveCustomerSubscription } from "@/lib/back-in-stock/server"
import {
  isBackInStockEmailConfigured,
  sendBackInStockEmail,
} from "@/lib/back-in-stock/email"
import {
  claimProductSubscribers,
  getAdminCustomerEmails,
  getAdminProductsAvailability,
  getWatchedProductIds,
  removeProductFromWatchedList,
  setAdminProductSubscribers,
  setWatchedProductIds,
} from "@/lib/shopify/backInStockAdmin"
import type { BisProductSubscriber } from "@/lib/back-in-stock/constants"

export type BackInStockProcessResult = {
  watched: number
  available: number
  claimed: number
  emailed: number
  failed: number
  skippedConflict: number
  removedFromWatch: number
  errors: string[]
}

function resolveStoreUrl(): string {
  const fromEnv =
    process.env.SHOPIFY_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://swifttcg.com"
  return fromEnv.replace(/\/$/, "")
}

export async function processBackInStockAlerts(): Promise<BackInStockProcessResult> {
  const result: BackInStockProcessResult = {
    watched: 0,
    available: 0,
    claimed: 0,
    emailed: 0,
    failed: 0,
    skippedConflict: 0,
    removedFromWatch: 0,
    errors: [],
  }

  if (!isBackInStockEmailConfigured()) {
    result.errors.push(
      "RESEND_API_KEY is not set — refusing to clear subscriptions without email."
    )
    return result
  }

  const watched = await getWatchedProductIds()
  result.watched = watched.productIds.length
  if (watched.productIds.length === 0) return result

  const availability = await getAdminProductsAvailability(watched.productIds)
  const available = availability.filter((p) => p.availableForSale)
  result.available = available.length

  const stillWatched = new Set(watched.productIds)
  const storeUrl = resolveStoreUrl()

  for (const product of available) {
    const claimed = await claimProductSubscribers(product.productId)
    if (claimed === null) {
      result.skippedConflict += 1
      continue
    }
    if (claimed.length === 0) {
      stillWatched.delete(product.productId)
      result.removedFromWatch += 1
      continue
    }

    result.claimed += claimed.length
    const emails = await getAdminCustomerEmails(
      claimed.map((s) => s.customerId)
    )
    const emailByCustomer = new Map(
      emails.map((row) => [row.customerId, row] as const)
    )

    const failedSubscribers: BisProductSubscriber[] = []

    for (const subscriber of claimed) {
      const customer = emailByCustomer.get(subscriber.customerId)
      const to = customer?.email

      if (!to) {
        result.failed += 1
        result.errors.push(
          `No email for customer ${subscriber.customerId} on ${product.productId}`
        )
        failedSubscribers.push(subscriber)
        continue
      }

      if (!product.handle || !product.title) {
        result.failed += 1
        failedSubscribers.push(subscriber)
        continue
      }

      try {
        await sendBackInStockEmail({
          to,
          storeUrl,
          product: {
            title: product.title,
            handle: product.handle,
            imageUrl: product.imageUrl,
            priceAmount: product.priceAmount,
            priceCurrency: product.priceCurrency,
          },
        })

        await adminRemoveCustomerSubscription({
          customerId: subscriber.customerId,
          productId: product.productId,
        })

        result.emailed += 1
      } catch (error) {
        result.failed += 1
        const message =
          error instanceof Error ? error.message : "Unknown email failure"
        result.errors.push(
          `${subscriber.customerId} / ${product.productId}: ${message}`
        )
        failedSubscribers.push(subscriber)
      }
    }

    if (failedSubscribers.length > 0) {
      // Re-queue failures so the next cron can retry (no silent drop).
      await setAdminProductSubscribers({
        productId: product.productId,
        subscribers: failedSubscribers,
      })
    } else {
      stillWatched.delete(product.productId)
      result.removedFromWatch += 1
    }
  }

  // Drop watched products that no longer exist or have empty indexes.
  for (const productId of [...stillWatched]) {
    if (!availability.some((p) => p.productId === productId)) {
      stillWatched.delete(productId)
      result.removedFromWatch += 1
    }
  }

  const nextIds = [...stillWatched]
  if (
    nextIds.length !== watched.productIds.length ||
    nextIds.some((id, index) => id !== watched.productIds[index])
  ) {
    try {
      await setWatchedProductIds({
        shopId: watched.shopId,
        productIds: nextIds,
        compareDigest: watched.compareDigest,
      })
    } catch {
      // Best-effort; individual removeProductFromWatchedList as fallback.
      for (const productId of watched.productIds) {
        if (!stillWatched.has(productId)) {
          await removeProductFromWatchedList(productId).catch(() => undefined)
        }
      }
    }
  }

  return result
}
