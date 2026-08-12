/**
 * Shop Pay accelerated checkout helpers.
 *
 * The official `<shop-pay-button>` web component (Checkout Links) is rendered
 * by `components/checkout/ShopPayButton`. This module formats its attributes
 * and lazy-loads Shopify's script — it does not call the Storefront API.
 *
 * @see https://shopify.dev/docs/storefronts/headless/additional-sdks/web-components
 */

/** Official Buy with Shop Pay loader (Shopify CDN). */
export const SHOP_PAY_SCRIPT_URL =
  "https://cdn.shopify.com/shopifycloud/shop-js/modules/v2/loader.pay-button.esm.js"

const VARIANT_GID_RE = /gid:\/\/shopify\/ProductVariant\/(\d+)/i
const NUMERIC_ID_RE = /^\d+$/

export type ShopPayLine = {
  id: string
  quantity?: number
}

/**
 * Normalize a Shopify store domain to the `store-url` the Shop Pay button needs.
 */
export function shopPayStoreUrlFromDomain(domain: string): string {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
  return `https://${host}`
}

/**
 * Server-only. Reads `SHOPIFY_STORE_DOMAIN` (not a secret).
 * Returns null when the env var is missing so the button can stay hidden.
 */
export function getShopPayStoreUrl(): string | null {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim()
  if (!domain) return null
  return shopPayStoreUrlFromDomain(domain)
}

/** Numeric variant id from a GID, encoded GID, or already-numeric id. */
export function parseShopPayVariantId(
  id: string | null | undefined
): string | null {
  if (!id) return null
  const trimmed = id.trim()
  if (!trimmed) return null
  if (NUMERIC_ID_RE.test(trimmed)) return trimmed

  const fromGid = trimmed.match(VARIANT_GID_RE)
  if (fromGid?.[1]) return fromGid[1]

  try {
    const decoded = decodeURIComponent(trimmed)
    const fromDecoded = decoded.match(VARIANT_GID_RE)
    if (fromDecoded?.[1]) return fromDecoded[1]
  } catch {
    // ignore malformed encoding
  }

  return null
}

/**
 * `variants` attribute for `<shop-pay-button>`:
 * `id` or `id:quantity`, comma-separated.
 */
export function formatShopPayVariants(
  lines: ReadonlyArray<ShopPayLine>
): string | null {
  const parts: string[] = []

  for (const line of lines) {
    const numericId = parseShopPayVariantId(line.id)
    if (!numericId) continue
    const quantity = line.quantity ?? 1
    if (!Number.isFinite(quantity) || quantity < 1) continue
    const qty = Math.floor(quantity)
    parts.push(qty === 1 ? numericId : `${numericId}:${qty}`)
  }

  return parts.length > 0 ? parts.join(",") : null
}

let shopPayScriptPromise: Promise<void> | null = null

/**
 * Load Shopify's Shop Pay web component once per page.
 * Safe to call from client components only.
 */
export function loadShopPayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (customElements.get("shop-pay-button")) return Promise.resolve()
  if (shopPayScriptPromise) return shopPayScriptPromise

  shopPayScriptPromise = (async () => {
    if (!document.querySelector(`script[src="${SHOP_PAY_SCRIPT_URL}"]`)) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script")
        script.type = "module"
        script.src = SHOP_PAY_SCRIPT_URL
        script.async = true
        script.onload = () => resolve()
        script.onerror = () =>
          reject(new Error("Shop Pay script failed to load"))
        document.head.appendChild(script)
      })
    }

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Shop Pay custom element timed out")),
        8000
      )
    })

    await Promise.race([
      customElements.whenDefined("shop-pay-button"),
      timeout,
    ])
  })().catch((error: unknown) => {
    shopPayScriptPromise = null
    throw error
  })

  return shopPayScriptPromise
}
