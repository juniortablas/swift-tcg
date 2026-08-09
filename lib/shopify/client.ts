/**
 * Shopify Storefront GraphQL client.
 *
 * Credentials come from environment variables (see `.env.local.example`).
 * Shopify is the single source of truth for storefront product data.
 *
 * Auth:
 * - Headless private tokens (`shpat_…`) → `Shopify-Storefront-Private-Token`
 * - Public Storefront tokens → `X-Shopify-Storefront-Access-Token`
 */

const PUBLIC_ACCESS_TOKEN_HEADER = "X-Shopify-Storefront-Access-Token"
const PRIVATE_ACCESS_TOKEN_HEADER = "Shopify-Storefront-Private-Token"
const BUYER_IP_HEADER = "Shopify-Storefront-Buyer-IP"

export type ShopifyConfig = {
  storeDomain: string
  storefrontToken: string
  apiVersion: string
}

export class ShopifyClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly errors?: unknown
  ) {
    super(message)
    this.name = "ShopifyClientError"
  }
}

/**
 * Headless private Storefront tokens use Shopify's `shpat_` access-token prefix.
 * Public tokens from the Headless channel are typically unprefixed hex strings.
 */
export function isPrivateStorefrontToken(token: string): boolean {
  return token.startsWith("shpat_")
}

/**
 * Build Storefront auth headers for server-side (Next.js / Node) requests.
 */
export function storefrontAuthHeaders(
  token: string,
  options?: { buyerIp?: string }
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (isPrivateStorefrontToken(token)) {
    headers[PRIVATE_ACCESS_TOKEN_HEADER] = token
    const buyerIp = options?.buyerIp?.trim()
    if (buyerIp) {
      headers[BUYER_IP_HEADER] = buyerIp
    }
  } else {
    headers[PUBLIC_ACCESS_TOKEN_HEADER] = token
  }

  return headers
}

/**
 * Read and validate Storefront credentials from the environment.
 */
export function getShopifyConfig(): ShopifyConfig {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim()
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN?.trim()
  const apiVersion =
    process.env.SHOPIFY_API_VERSION?.trim() || "2025-10"

  if (!storeDomain) {
    throw new ShopifyClientError(
      "Missing SHOPIFY_STORE_DOMAIN. Copy .env.local.example to .env.local and set your store domain."
    )
  }

  if (!storefrontToken) {
    throw new ShopifyClientError(
      "Missing SHOPIFY_STOREFRONT_TOKEN. Copy .env.local.example to .env.local and set your Storefront API token."
    )
  }

  return { storeDomain, storefrontToken, apiVersion }
}

function storefrontEndpoint(config: ShopifyConfig): string {
  const domain = config.storeDomain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")

  return `https://${domain}/api/${config.apiVersion}/graphql.json`
}

export type ShopifyFetchOptions = {
  query: string
  variables?: Record<string, unknown>
  /** Optional override — defaults to `getShopifyConfig()`. */
  config?: ShopifyConfig
  /**
   * Buyer IP for private-token requests triggered by real traffic.
   * Forward from the incoming Next.js request (e.g. `x-forwarded-for`).
   * Omit for builds, scripts, and other non-buyer contexts.
   */
  buyerIp?: string
  /**
   * Next.js `fetch` cache mode. Defaults to the framework default
   * (uncached). CMS / metaobject loaders may pass `force-cache`.
   */
  cache?: RequestCache
  /** Next.js fetch revalidation / tag options. */
  next?: NextFetchRequestConfig
}

type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string }>
}

/**
 * Execute a Storefront API GraphQL request.
 */
export async function shopifyFetch<T>({
  query,
  variables,
  config,
  buyerIp,
  cache,
  next,
}: ShopifyFetchOptions): Promise<T> {
  const resolved = config ?? getShopifyConfig()
  const endpoint = storefrontEndpoint(resolved)

  const response = await fetch(endpoint, {
    method: "POST",
    headers: storefrontAuthHeaders(resolved.storefrontToken, { buyerIp }),
    body: JSON.stringify({ query, variables }),
    ...(cache ? { cache } : {}),
    ...(next ? { next } : {}),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new ShopifyClientError(
      `Shopify Storefront request failed (${response.status}): ${body || response.statusText}`,
      response.status
    )
  }

  const json = (await response.json()) as GraphQLResponse<T>

  if (json.errors?.length) {
    throw new ShopifyClientError(
      `Shopify GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
      response.status,
      json.errors
    )
  }

  if (json.data === undefined) {
    throw new ShopifyClientError(
      "Shopify Storefront response did not include data."
    )
  }

  return json.data
}
