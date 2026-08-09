/**
 * Discover OpenID + Customer Account API endpoints from the shop domain.
 * @see https://shopify.dev/docs/api/customer/latest#discovery-endpoints
 */

import { ShopifyClientError, getShopifyConfig } from "../client"

export type OpenIdConfiguration = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint: string
  jwks_uri: string
  scopes_supported?: string[]
}

export type CustomerAccountApiDiscovery = {
  graphql_api: string
  mcp_api?: string
}

type CacheEntry<T> = { value: T; expiresAtMs: number }

const CACHE_TTL_MS = 60 * 60 * 1000

let openIdCache: CacheEntry<OpenIdConfiguration> | null = null
let apiCache: CacheEntry<CustomerAccountApiDiscovery> | null = null

function storeDomain(): string {
  return getShopifyConfig()
    .storeDomain.replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new ShopifyClientError(
      `Customer Account discovery failed (${response.status}) for ${url}: ${body || response.statusText}`,
      response.status
    )
  }

  return (await response.json()) as T
}

export async function discoverOpenIdConfiguration(): Promise<OpenIdConfiguration> {
  if (openIdCache && Date.now() < openIdCache.expiresAtMs) {
    return openIdCache.value
  }

  const url = `https://${storeDomain()}/.well-known/openid-configuration`
  const value = await fetchJson<OpenIdConfiguration>(url)

  if (
    !value.authorization_endpoint ||
    !value.token_endpoint ||
    !value.end_session_endpoint
  ) {
    throw new ShopifyClientError(
      "OpenID discovery response missing required Customer Account endpoints."
    )
  }

  openIdCache = { value, expiresAtMs: Date.now() + CACHE_TTL_MS }
  return value
}

export async function discoverCustomerAccountApi(): Promise<CustomerAccountApiDiscovery> {
  if (apiCache && Date.now() < apiCache.expiresAtMs) {
    return apiCache.value
  }

  const url = `https://${storeDomain()}/.well-known/customer-account-api`
  const value = await fetchJson<CustomerAccountApiDiscovery>(url)

  if (!value.graphql_api) {
    throw new ShopifyClientError(
      "Customer Account API discovery response missing graphql_api."
    )
  }

  apiCache = { value, expiresAtMs: Date.now() + CACHE_TTL_MS }
  return value
}
