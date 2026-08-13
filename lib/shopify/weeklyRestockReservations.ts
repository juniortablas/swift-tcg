/**
 * Weekly restock remaining from product metafields.
 *
 * Remaining = weekly_restock_limit − current_weekly_reservations.
 * Runtime never searches Shopify orders. Unreadable counters fail closed.
 */

import * as Sentry from "@sentry/nextjs"

import {
  parseIntegerMetafield,
  parseReservationCounterMetafield,
  remainingReservations,
} from "@/lib/product/weeklyRestock"

export const WEEKLY_RESTOCK_CACHE_TAG = "weekly-restock"

export function weeklyRestockProductCacheTag(productId: string): string {
  return `weekly-restock-${productId}`
}

export function captureWeeklyRestockFailure(
  error: unknown,
  extra?: Record<string, unknown>
): void {
  Sentry.captureException(
    error instanceof Error ? error : new Error(String(error)),
    {
      tags: { feature: "weekly_restock" },
      extra,
    }
  )
}

export type WeeklyRestockRemainingRead =
  | { ok: true; remaining: number; reserved: number; limit: number }
  | { ok: false }

/**
 * Remaining reservation spots from the two product metafields.
 * Missing counter → 0 reserved. Invalid counter → fail closed.
 */
export function remainingFromMetafields(
  limitValue: string | null | undefined,
  reservedValue: string | null | undefined
): WeeklyRestockRemainingRead {
  const reserved = parseReservationCounterMetafield(reservedValue)
  if (!reserved.ok) return { ok: false }
  const limit = parseIntegerMetafield(limitValue)
  return {
    ok: true,
    limit,
    reserved: reserved.value,
    remaining: remainingReservations(limit, reserved.value),
  }
}

export function remainingFromMappedProduct(product: {
  weeklyRestockLimit?: number | null
  weeklyRestockReserved?: number | null
}): WeeklyRestockRemainingRead {
  if (product.weeklyRestockReserved == null) return { ok: false }
  const limit = product.weeklyRestockLimit ?? 0
  return {
    ok: true,
    limit,
    reserved: product.weeklyRestockReserved,
    remaining: remainingReservations(limit, product.weeklyRestockReserved),
  }
}

export function limitFromMetafield(
  value: string | null | undefined
): number {
  return parseIntegerMetafield(value)
}
