/**
 * OAuth 2.0 authorization code + PKCE for Shopify New Customer Accounts.
 * @see https://shopify.dev/docs/api/customer/latest#step-authorization
 */

import { ShopifyClientError } from "../client"
import {
  getCustomerAccountCallbackUrl,
  getCustomerAccountConfig,
  getCustomerAccountLogoutRedirectUrl,
} from "./config"
import { discoverOpenIdConfiguration } from "./discovery"
import {
  CUSTOMER_ACCOUNT_SCOPES,
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
  type PkceAuthState,
} from "./pkce"
import {
  clearCustomerSession,
  clearPkceCookie,
  setCustomerSession,
  setPkceCookie,
  type CustomerSessionTokens,
} from "./session"

export type TokenResponse = {
  access_token: string
  expires_in: number
  id_token: string
  refresh_token: string
  token_type?: string
}

function toSessionTokens(token: TokenResponse): CustomerSessionTokens {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    idToken: token.id_token,
    expiresAt: Date.now() + Math.max(token.expires_in - 60, 30) * 1000,
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2 || !parts[1]) return null
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const pad =
      padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
    return JSON.parse(Buffer.from(padded + pad, "base64").toString("utf8")) as Record<
      string,
      unknown
    >
  } catch {
    return null
  }
}

function sanitizeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) return "/account"
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return "/account"
  if (returnTo.startsWith("/account/login")) return "/account"
  if (returnTo.startsWith("/account/authorize")) return "/account"
  if (returnTo.startsWith("/account/logout")) return "/account"
  return returnTo
}

/**
 * Build authorization URL and persist PKCE state in an httpOnly cookie.
 */
export async function beginCustomerLogin(options?: {
  returnTo?: string | null
}): Promise<string> {
  const config = getCustomerAccountConfig()
  const openId = await discoverOpenIdConfiguration()

  const pkce: PkceAuthState = {
    state: generateState(),
    nonce: generateNonce(),
    codeVerifier: generateCodeVerifier(),
    returnTo: sanitizeReturnTo(options?.returnTo),
  }

  await setPkceCookie(pkce)

  const url = new URL(openId.authorization_endpoint)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("redirect_uri", getCustomerAccountCallbackUrl(config))
  url.searchParams.set("scope", CUSTOMER_ACCOUNT_SCOPES)
  url.searchParams.set("state", pkce.state)
  url.searchParams.set("nonce", pkce.nonce)
  url.searchParams.set("code_challenge", generateCodeChallenge(pkce.codeVerifier))
  url.searchParams.set("code_challenge_method", "S256")

  return url.toString()
}

async function postToken(
  body: URLSearchParams
): Promise<TokenResponse> {
  const config = getCustomerAccountConfig()
  const openId = await discoverOpenIdConfiguration()

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  }

  if (config.clientSecret) {
    const basic = Buffer.from(
      `${config.clientId}:${config.clientSecret}`
    ).toString("base64")
    headers.Authorization = `Basic ${basic}`
  }

  const response = await fetch(openId.token_endpoint, {
    method: "POST",
    headers,
    body,
  })

  const json = (await response.json().catch(() => null)) as
    | (TokenResponse & { error?: string; error_description?: string })
    | null

  if (!response.ok || !json?.access_token) {
    const detail =
      json?.error_description ||
      json?.error ||
      (json ? JSON.stringify(json) : response.statusText)
    throw new ShopifyClientError(
      `Customer Account token exchange failed (${response.status}): ${detail}`,
      response.status
    )
  }

  if (!json.refresh_token || !json.id_token) {
    throw new ShopifyClientError(
      "Customer Account token response missing refresh_token or id_token."
    )
  }

  return json
}

/**
 * Exchange authorization code for tokens and persist the session.
 * Returns the sanitized path to redirect the customer to.
 */
export async function completeCustomerLogin(params: {
  code: string | null
  state: string | null
  error?: string | null
  errorDescription?: string | null
}): Promise<{ returnTo: string }> {
  if (params.error) {
    throw new ShopifyClientError(
      `Customer login failed: ${params.errorDescription || params.error}`
    )
  }

  if (!params.code || !params.state) {
    throw new ShopifyClientError(
      "Customer login callback missing code or state."
    )
  }

  const { readPkceCookie } = await import("./session")
  const pkce = await readPkceCookie()
  if (!pkce || pkce.state !== params.state) {
    throw new ShopifyClientError(
      "Customer login state mismatch. Start login again."
    )
  }

  const config = getCustomerAccountConfig()
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    redirect_uri: getCustomerAccountCallbackUrl(config),
    code: params.code,
    code_verifier: pkce.codeVerifier,
  })

  const token = await postToken(body)
  const payload = decodeJwtPayload(token.id_token)
  if (payload?.nonce && payload.nonce !== pkce.nonce) {
    throw new ShopifyClientError("Customer login nonce mismatch.")
  }

  await setCustomerSession(toSessionTokens(token))
  await clearPkceCookie()

  return { returnTo: sanitizeReturnTo(pkce.returnTo) }
}

export async function refreshCustomerAccessToken(
  refreshToken: string
): Promise<CustomerSessionTokens> {
  const config = getCustomerAccountConfig()
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: refreshToken,
  })

  const token = await postToken(body)
  const session = toSessionTokens(token)
  await setCustomerSession(session)
  return session
}

/**
 * Build Shopify logout URL and clear local session cookies.
 */
export async function beginCustomerLogout(idToken: string): Promise<string> {
  const config = getCustomerAccountConfig()
  const openId = await discoverOpenIdConfiguration()

  await clearCustomerSession()
  await clearPkceCookie()

  const url = new URL(openId.end_session_endpoint)
  url.searchParams.set("id_token_hint", idToken)
  url.searchParams.set(
    "post_logout_redirect_uri",
    getCustomerAccountLogoutRedirectUrl(config)
  )
  return url.toString()
}
