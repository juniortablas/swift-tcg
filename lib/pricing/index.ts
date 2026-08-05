/**
 * Storefront pricing engine.
 *
 * Pipeline: wholesale JPY → USD cost → retail USD (charm .99).
 * Wholesale `cost` is for internal/import use only — never render it in UI.
 */

/** USD per ¥1 — aligned with Sora CardShop's embedded FX table. */
export const USD_PER_JPY = 0.006344

/** Markup applied when USD wholesale cost is below the tier threshold. */
export const RETAIL_MARKUP_LOW = 1.6

/** Markup applied when USD wholesale cost is at/above the tier threshold. */
export const RETAIL_MARKUP_HIGH = 1.45

/** Cost threshold (USD) separating low vs high retail markup. */
export const RETAIL_MARKUP_THRESHOLD_USD = 50

/** Round a positive amount down to the nearest X.99 charm price. */
export function roundToNinetyNine(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0.99
  return Math.floor(amount) + 0.99
}

/** Convert wholesale JPY to USD cost (2 decimal places). */
export function wholesaleJpyToCostUsd(
  jpy: number,
  rate: number = USD_PER_JPY
): number {
  return Math.round(jpy * rate * 100) / 100
}

/**
 * Retail USD from wholesale USD cost.
 *
 * Examples (cost → price):
 *   72.40 → 104.99
 *   48.10 → 76.99
 */
export function calculateRetailPrice(costUsd: number): number {
  const markup =
    costUsd < RETAIL_MARKUP_THRESHOLD_USD
      ? RETAIL_MARKUP_LOW
      : RETAIL_MARKUP_HIGH
  return roundToNinetyNine(costUsd * markup)
}

export type PricedAmounts = {
  /** Wholesale USD cost. Null when JPY wholesale is unavailable. */
  cost: number | null
  /** Retail USD price. Null when there is no wholesale cost. */
  price: number | null
}

/** Derive cost + retail price from a wholesale JPY amount. */
export function priceFromWholesaleJpy(
  wholesaleJpy: number | null | undefined
): PricedAmounts {
  if (typeof wholesaleJpy !== "number" || !Number.isFinite(wholesaleJpy)) {
    return { cost: null, price: null }
  }

  const cost = wholesaleJpyToCostUsd(wholesaleJpy)
  return {
    cost,
    price: calculateRetailPrice(cost),
  }
}

/** Format retail USD for the storefront. Never pass wholesale cost here. */
export function formatUsdPrice(price: number | null | undefined): string {
  if (typeof price !== "number" || !Number.isFinite(price)) {
    return "Coming Soon"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price)
}
