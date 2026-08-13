/** Persists only the Shopify cart id — line items live on Shopify. */
export const CART_ID_STORAGE_KEY = "swift-tcg-shopify-cart-id"
export const CART_ID_COOKIE = "swift-tcg-shopify-cart-id"

/** Coalesce rapid +/- clicks into a single Storefront cart mutation. */
export const CART_QUANTITY_DEBOUNCE_MS = 280
