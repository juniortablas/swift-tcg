/**
 * Customer Account API configuration (New Customer Accounts / headless OAuth).
 *
 * Credentials come from Headless channel → Customer Account API settings.
 * @see https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started
 */

import { ShopifyClientError, getShopifyConfig } from "../client"

export type CustomerAccountConfig = {
  storeDomain: string
  /** Numeric shop id, e.g. `78387708009`. */
  shopId: string
  clientId: string
  /** Present for confidential clients only. */
  clientSecret: string | null
  /** Public HTTPS origin of this storefront (no trailing slash). */
  appUrl: string
  /** Callback path registered in Headless Customer Account API settings. */
  callbackPath: string
  /** Optional post-logout landing path. */
  logoutPath: string
  sessionSecret: string
}

const DEFAULT_CALLBACK_PATH = "/account/authorize"
const DEFAULT_LOGOUT_PATH = "/"

function normalizeOrigin(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "")
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new ShopifyClientError(
      "SHOPIFY_APP_URL must be an absolute URL (e.g. https://swifttcg.com or an HTTPS tunnel)."
    )
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new ShopifyClientError(
      "SHOPIFY_APP_URL must use https:// (Shopify Customer Account OAuth rejects http except localhost development caveats)."
    )
  }
  return `${parsed.protocol}//${parsed.host}`
}

/**
 * Read Customer Account API credentials from the environment.
 */
export function getCustomerAccountConfig(): CustomerAccountConfig {
  const { storeDomain } = getShopifyConfig()
  const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim()
  const shopId =
    process.env.SHOPIFY_SHOP_ID?.trim() ||
    process.env.SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID?.trim()
  const appUrlRaw =
    process.env.SHOPIFY_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim()
  const clientSecret =
    process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET?.trim() || null
  const sessionSecret =
    process.env.SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET?.trim() ||
    process.env.SHOPIFY_CLIENT_SECRET?.trim() ||
    clientId

  if (!clientId) {
    throw new ShopifyClientError(
      "Missing SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID. Copy it from Shopify Admin → Sales channels → Headless → Customer Account API."
    )
  }

  if (!shopId) {
    throw new ShopifyClientError(
      "Missing SHOPIFY_SHOP_ID. Use the numeric shop id from Customer Account discovery (e.g. 78387708009)."
    )
  }

  if (!appUrlRaw) {
    throw new ShopifyClientError(
      "Missing SHOPIFY_APP_URL. Set your public HTTPS origin (production domain or ngrok tunnel). Shopify rejects localhost callbacks."
    )
  }

  if (!sessionSecret) {
    throw new ShopifyClientError(
      "Missing SHOPIFY_CUSTOMER_ACCOUNT_SESSION_SECRET (or SHOPIFY_CLIENT_SECRET) for sealing customer session cookies."
    )
  }

  const callbackPath =
    process.env.SHOPIFY_CUSTOMER_ACCOUNT_CALLBACK_PATH?.trim() ||
    DEFAULT_CALLBACK_PATH
  const logoutPath =
    process.env.SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_PATH?.trim() ||
    DEFAULT_LOGOUT_PATH

  return {
    storeDomain,
    shopId,
    clientId,
    clientSecret,
    appUrl: normalizeOrigin(appUrlRaw),
    callbackPath: callbackPath.startsWith("/")
      ? callbackPath
      : `/${callbackPath}`,
    logoutPath: logoutPath.startsWith("/") ? logoutPath : `/${logoutPath}`,
    sessionSecret,
  }
}

export function getCustomerAccountCallbackUrl(
  config = getCustomerAccountConfig()
): string {
  return `${config.appUrl}${config.callbackPath}`
}

export function getCustomerAccountLogoutRedirectUrl(
  config = getCustomerAccountConfig()
): string {
  return `${config.appUrl}${config.logoutPath}`
}

/** Soft check used by UI — does not throw. */
export function isCustomerAccountConfigured(): boolean {
  return Boolean(
    process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim() &&
      (process.env.SHOPIFY_SHOP_ID?.trim() ||
        process.env.SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID?.trim()) &&
      (process.env.SHOPIFY_APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim())
  )
}
