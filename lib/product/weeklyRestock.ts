import type { Product, ProductStatus } from "@/types/product"

/** Shopify product metafield that opts a SKU into weekly restock reservations. */
export const WEEKLY_RESTOCK_NAMESPACE = "custom"
export const WEEKLY_RESTOCK_KEY = "allow_weekly_restock"
export const WEEKLY_RESTOCK_LIMIT_KEY = "weekly_restock_limit"
/** Outstanding paid reservations. Remaining = limit − this counter. */
export const WEEKLY_RESTOCK_COUNT_KEY = "current_weekly_reservations"
/**
 * Admin-only JSON ledger of per-order outstanding qty + processed webhook IDs.
 * Keeps `current_weekly_reservations` idempotent across order lifecycle events.
 */
export const WEEKLY_RESTOCK_LEDGER_KEY = "weekly_restock_reservation_ledger"

/** Cart / order attribute attached when any line is a weekly restock reservation. */
export const WEEKLY_RESTOCK_ATTRIBUTE = "weekly_restock"

/**
 * How long cart/session reservation remaining stays valid before the next
 * Storefront metafield read. Quantity clicks never recompute during this window.
 */
export const RESERVATION_CACHE_TTL_MS = 60_000

/** Show urgency copy/styling at or below this remaining count. */
export const WEEKLY_RESTOCK_URGENCY_THRESHOLD = 5

export function parseBooleanMetafield(
  value: string | null | undefined
): boolean {
  return value?.trim().toLowerCase() === "true"
}

export function parseIntegerMetafield(
  value: string | null | undefined
): number {
  if (value == null || value.trim() === "") return 0
  const parsed = Number.parseInt(value.trim(), 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

export type ReservationCounterRead =
  | { ok: true; value: number }
  | { ok: false }

/**
 * Parse `custom.current_weekly_reservations`.
 * Missing/empty → 0 (uninitialized product). Invalid → fail closed.
 */
export function parseReservationCounterMetafield(
  value: string | null | undefined
): ReservationCounterRead {
  if (value == null || value.trim() === "") return { ok: true, value: 0 }
  const parsed = Number(value.trim())
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return { ok: false }
  }
  return { ok: true, value: parsed }
}

export function clampReservationCount(count: number, limit: number): number {
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0
  const used = Number.isFinite(count) ? Math.floor(count) : 0
  return Math.max(0, Math.min(cap, used))
}

function hasPreorderTag(tags: string[] | undefined): boolean {
  return (tags ?? []).some((tag) => {
    const normalized = tag.trim().toLowerCase()
    return normalized === "preorder" || normalized === "pre-order"
  })
}

/**
 * Whether a Shopify product should map to the weekly restock reservation state
 * before applying the reservation limit.
 *
 * Preorder tags always win. In-stock quantity (> 0) always wins.
 * Untracked inventory that is still availableForSale stays in-stock.
 */
export function shouldMapWeeklyRestock(input: {
  tags?: string[]
  availableForSale: boolean
  totalInventory?: number | null
  allowWeeklyRestock: boolean
}): boolean {
  if (!input.allowWeeklyRestock) return false
  if (hasPreorderTag(input.tags)) return false
  if (typeof input.totalInventory === "number" && input.totalInventory > 0) {
    return false
  }
  if (
    input.availableForSale &&
    typeof input.totalInventory === "number" &&
    input.totalInventory <= 0
  ) {
    return true
  }
  return !input.availableForSale
}

export function remainingReservations(
  limit: number,
  reserved: number
): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0
  const used = Number.isFinite(reserved) && reserved > 0 ? reserved : 0
  return Math.max(0, Math.floor(limit) - Math.floor(used))
}

export function reservedFromRemaining(limit: number, remaining: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0
  return Math.max(0, Math.floor(limit) - Math.max(0, Math.floor(remaining)))
}

/** PDP remaining line. Full fraction lives on the product page only. */
export function weeklyRestockRemainingCopy(
  remaining: number,
  limit: number
): string {
  if (remaining <= WEEKLY_RESTOCK_URGENCY_THRESHOLD) {
    if (remaining === 1) return "Only 1 reservation remaining."
    return `Only ${remaining} reservations remaining.`
  }
  return `${remaining} of ${limit} reservations remaining`
}

export function weeklyRestockFractionLabel(
  remaining: number,
  limit: number
): string {
  return `${remaining} / ${limit}`
}

export function weeklyRestockLimitMessage(remaining: number): string {
  if (remaining === 1) return "Only 1 reservation spot remains."
  return `Only ${remaining} reservation spots remain.`
}

export function weeklyRestockLeftLabel(remaining: number): string {
  return remaining === 1 ? "1 left" : `${remaining} left`
}

export function isWeeklyRestockStatus(
  status: ProductStatus | undefined
): boolean {
  return status === "weekly_restock"
}

export function isWeeklyRestockProduct(product: Product): boolean {
  return isWeeklyRestockStatus(product.status)
}

/**
 * How many more units can be added to this cart without exceeding the
 * global remaining reservation inventory. Not a per-customer cap.
 */
export function weeklyRestockAddableQuantity(
  product: Product,
  items: Array<{ productId: string; quantity: number }>
): number {
  if (!isWeeklyRestockProduct(product)) return Number.POSITIVE_INFINITY
  const remaining = product.weeklyRestockRemaining ?? 0
  const inCart = items
    .filter((item) => item.productId === product.id)
    .reduce((sum, item) => sum + item.quantity, 0)
  return Math.max(0, remaining - inCart)
}

export function shopifyNumericId(gid: string): string | null {
  const match = gid.trim().match(/\/(\d+)\s*$/)
  return match?.[1] ?? null
}
