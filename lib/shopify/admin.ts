/**
 * Shopify Admin GraphQL client.
 *
 * Used by importer/sync scripts for write operations (collections, products).
 * Do not call from React components — keep Admin credentials server/script only.
 *
 * Auth: Client Credentials grant
 * (`SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` → short-lived access token).
 * Tokens are cached in memory for the process and refreshed before expiry.
 */

import { ShopifyClientError } from "./client"
import {
  isShopifyThrottledGraphQLErrors,
  isShopifyThrottledHttpStatus,
  isShopifyThrottledMessage,
  withShopifyThrottleRetry,
} from "./throttle"

export type ShopifyAdminConfig = {
  storeDomain: string
  clientId: string
  clientSecret: string
  apiVersion: string
}

type CachedAccessToken = {
  accessToken: string
  /** Epoch ms when the token should be treated as expired. */
  expiresAtMs: number
}

/** Refresh slightly before Shopify's reported expiry. */
const TOKEN_EXPIRY_SKEW_MS = 60_000

/** Reject obvious placeholder / truncated credential values. */
const MIN_CLIENT_CREDENTIAL_LENGTH = 16

let cachedToken: CachedAccessToken | null = null
/** Deduplicate concurrent token requests within this process. */
let inflightTokenRequest: Promise<string> | null = null
/**
 * Sticky auth failure for this process — avoids re-requesting a token that
 * will keep failing (bad client id/secret, app not installed, etc.).
 */
let cachedAuthError: ShopifyClientError | null = null

/**
 * Normalize a shop domain to `store.myshopify.com` (no protocol / trailing slash).
 */
function normalizeStoreDomain(storeDomain: string): string {
  return storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

function assertClientCredential(
  name: "SHOPIFY_CLIENT_ID" | "SHOPIFY_CLIENT_SECRET",
  value: string | undefined
): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) {
    throw new ShopifyClientError(
      `Missing ${name}. Copy it from Dev Dashboard → Apps → your app → Settings into .env.local.`
    )
  }
  if (trimmed.length < MIN_CLIENT_CREDENTIAL_LENGTH) {
    throw new ShopifyClientError(
      `${name} looks invalid (length ${trimmed.length}). ` +
        `Paste the full Client ${name === "SHOPIFY_CLIENT_ID" ? "ID" : "secret"} ` +
        `from Dev Dashboard → Apps → your app → Settings. ` +
        `Do not use the Storefront token (shpat_…) here.`
    )
  }
  return trimmed
}

/**
 * Read and validate Admin API client credentials from the environment.
 */
export function getShopifyAdminConfig(): ShopifyAdminConfig {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim()
  const apiVersion =
    process.env.SHOPIFY_API_VERSION?.trim() || "2025-10"

  if (!storeDomain) {
    throw new ShopifyClientError(
      "Missing SHOPIFY_STORE_DOMAIN. Copy .env.local.example to .env.local and set your store domain."
    )
  }

  const clientId = assertClientCredential(
    "SHOPIFY_CLIENT_ID",
    process.env.SHOPIFY_CLIENT_ID
  )
  const clientSecret = assertClientCredential(
    "SHOPIFY_CLIENT_SECRET",
    process.env.SHOPIFY_CLIENT_SECRET
  )

  return { storeDomain, clientId, clientSecret, apiVersion }
}

function adminEndpoint(config: ShopifyAdminConfig): string {
  const domain = normalizeStoreDomain(config.storeDomain)
  return `https://${domain}/admin/api/${config.apiVersion}/graphql.json`
}

function tokenEndpoint(config: ShopifyAdminConfig): string {
  const domain = normalizeStoreDomain(config.storeDomain)
  return `https://${domain}/admin/oauth/access_token`
}

type TokenResponse = {
  access_token?: string
  scope?: string
  expires_in?: number
  error?: string
  error_description?: string
}

/**
 * Exchange client credentials for a short-lived Admin API access token.
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant
 */
async function requestClientCredentialsToken(
  config: ShopifyAdminConfig
): Promise<CachedAccessToken> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const response = await fetch(tokenEndpoint(config), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  })

  const json = (await response.json().catch(() => null)) as TokenResponse | null

  if (!response.ok) {
    const detail =
      json?.error_description ||
      json?.error ||
      (json ? JSON.stringify(json) : response.statusText)

    let hint = ""
    if (/application with api_key|application_cannot_be_found/i.test(detail)) {
      hint =
        " Check that SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET match the Dev Dashboard app, " +
        "and that the app is installed on this store."
    } else if (/shop_not_permitted/i.test(detail)) {
      hint =
        " Client credentials only work when the app and store are in the same Shopify organization."
    }

    throw new ShopifyClientError(
      `Shopify Admin client credentials request failed (${response.status}): ${detail}.${hint}`,
      response.status
    )
  }

  const accessToken = json?.access_token?.trim()
  if (!accessToken) {
    throw new ShopifyClientError(
      "Shopify Admin client credentials response did not include access_token."
    )
  }

  const expiresInSeconds =
    typeof json?.expires_in === "number" && json.expires_in > 0
      ? json.expires_in
      : 86_399

  return {
    accessToken,
    expiresAtMs: Date.now() + expiresInSeconds * 1000,
  }
}

function isTokenFresh(token: CachedAccessToken): boolean {
  return Date.now() < token.expiresAtMs - TOKEN_EXPIRY_SKEW_MS
}

/**
 * Return a cached Admin access token, requesting a new one when missing/expired.
 * Concurrent callers share a single in-flight request.
 * Auth configuration failures are sticky for the process (fail fast).
 */
export async function getShopifyAdminAccessToken(
  config?: ShopifyAdminConfig
): Promise<string> {
  if (cachedAuthError) {
    throw cachedAuthError
  }

  const resolved = config ?? getShopifyAdminConfig()

  if (cachedToken && isTokenFresh(cachedToken)) {
    return cachedToken.accessToken
  }

  if (inflightTokenRequest) {
    return inflightTokenRequest
  }

  inflightTokenRequest = requestClientCredentialsToken(resolved)
    .then((token) => {
      cachedToken = token
      cachedAuthError = null
      return token.accessToken
    })
    .catch((error: unknown) => {
      if (error instanceof ShopifyClientError) {
        // 4xx means credentials/config will not recover mid-run.
        if (error.status != null && error.status >= 400 && error.status < 500) {
          cachedAuthError = error
        }
      }
      throw error
    })
    .finally(() => {
      inflightTokenRequest = null
    })

  return inflightTokenRequest
}

/**
 * Probe Admin auth and required product scopes once.
 * Throws on token or `read_products` failure so bulk sync can abort early.
 */
export async function verifyShopifyAdminAuth(
  config?: ShopifyAdminConfig
): Promise<{ storeDomain: string; apiVersion: string; scopeHint: string }> {
  const resolved = config ?? getShopifyAdminConfig()
  await getShopifyAdminAccessToken(resolved)

  // Lightweight Admin read — requires `read_products`.
  try {
    await shopifyAdminFetch<{ products: { nodes: Array<{ id: string }> } }>({
      query: /* GraphQL */ `
        query VerifyReadProducts {
          products(first: 1) {
            nodes {
              id
            }
          }
        }
      `,
      config: resolved,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/Access denied|read_products/i.test(message)) {
      throw new ShopifyClientError(
        `Shopify Admin token works, but is missing required scopes. ` +
          `In Dev Dashboard → your app → Versions/Configuration, enable at least ` +
          `read_products and write_products (plus read_publications + write_publications ` +
          `to publish). Then reinstall/update the app on the store and retry.\n` +
          `Original error: ${message}`,
        403
      )
    }
    throw error
  }

  return {
    storeDomain: normalizeStoreDomain(resolved.storeDomain),
    apiVersion: resolved.apiVersion,
    scopeHint: "token + read_products OK",
  }
}

export type ShopifyAdminFetchOptions = {
  query: string
  variables?: Record<string, unknown>
  /** Optional override — defaults to `getShopifyAdminConfig()`. */
  config?: ShopifyAdminConfig
}

type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string; extensions?: { code?: string | null } }>
}

function adminGraphQLError(
  errors: NonNullable<GraphQLResponse<unknown>["errors"]>,
  httpStatus: number
): ShopifyClientError {
  const throttled = isShopifyThrottledGraphQLErrors(errors)
  return new ShopifyClientError(
    `Shopify Admin GraphQL error: ${errors.map((error) => error.message).join("; ")}`,
    throttled ? 429 : httpStatus,
    errors
  )
}

async function shopifyAdminFetchOnce<T>({
  query,
  variables,
  config,
}: ShopifyAdminFetchOptions): Promise<T> {
  const resolved = config ?? getShopifyAdminConfig()
  const accessToken = await getShopifyAdminAccessToken(resolved)
  const endpoint = adminEndpoint(resolved)

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    const throttled =
      isShopifyThrottledHttpStatus(response.status) ||
      isShopifyThrottledMessage(body)
    throw new ShopifyClientError(
      `Shopify Admin request failed (${response.status}): ${body || response.statusText}`,
      throttled ? 429 : response.status
    )
  }

  const json = (await response.json()) as GraphQLResponse<T>

  if (json.errors?.length) {
    throw adminGraphQLError(json.errors, response.status)
  }

  if (json.data === undefined) {
    throw new ShopifyClientError(
      "Shopify Admin response did not include data."
    )
  }

  return json.data
}

/**
 * Execute an Admin API GraphQL request.
 * Obtains (and caches) a client-credentials access token automatically.
 * Retries Shopify throttle responses with exponential backoff.
 */
export async function shopifyAdminFetch<T>(
  options: ShopifyAdminFetchOptions
): Promise<T> {
  return withShopifyThrottleRetry(() => shopifyAdminFetchOnce<T>(options))
}
