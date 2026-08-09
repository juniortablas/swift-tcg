/**
 * Signed httpOnly cookie session for Customer Account tokens.
 * Auth remains Shopify-managed; we only store tokens issued by Shopify.
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

import {
  getCustomerAccountConfig,
  type CustomerAccountConfig,
} from "./config"
import type { PkceAuthState } from "./pkce"

export const CUSTOMER_SESSION_COOKIE = "swift_ca_session"
export const CUSTOMER_PKCE_COOKIE = "swift_ca_pkce"
/** Non-sensitive flag for client UI (navbar). */
export const CUSTOMER_LOGGED_IN_COOKIE = "swift_ca_logged_in"
export const CART_ID_COOKIE = "swift-tcg-shopify-cart-id"

export type CustomerSessionTokens = {
  accessToken: string
  refreshToken: string
  idToken: string
  /** Epoch ms when the access token expires. */
  expiresAt: number
}

function b64urlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function b64urlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, "base64").toString("utf8")
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function seal(data: unknown, secret: string): string {
  const payload = b64urlEncode(JSON.stringify(data))
  return `${payload}.${sign(payload, secret)}`
}

function unseal<T>(token: string, secret: string): T | null {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expected = sign(payload, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    return JSON.parse(b64urlDecode(payload)) as T
  } catch {
    return null
  }
}

function cookieSecure(config: CustomerAccountConfig): boolean {
  return config.appUrl.startsWith("https://")
}

function baseCookieOptions(config: CustomerAccountConfig) {
  return {
    httpOnly: true as const,
    secure: cookieSecure(config),
    sameSite: "lax" as const,
    path: "/",
  }
}

export async function setPkceCookie(state: PkceAuthState): Promise<void> {
  const config = getCustomerAccountConfig()
  const jar = await cookies()
  jar.set(CUSTOMER_PKCE_COOKIE, seal(state, config.sessionSecret), {
    ...baseCookieOptions(config),
    maxAge: 60 * 10,
  })
}

export async function readPkceCookie(): Promise<PkceAuthState | null> {
  const config = getCustomerAccountConfig()
  const jar = await cookies()
  const raw = jar.get(CUSTOMER_PKCE_COOKIE)?.value
  if (!raw) return null
  return unseal<PkceAuthState>(raw, config.sessionSecret)
}

export async function clearPkceCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(CUSTOMER_PKCE_COOKIE)
}

export async function setCustomerSession(
  tokens: CustomerSessionTokens
): Promise<void> {
  const config = getCustomerAccountConfig()
  const jar = await cookies()
  jar.set(CUSTOMER_SESSION_COOKIE, seal(tokens, config.sessionSecret), {
    ...baseCookieOptions(config),
    maxAge: 60 * 60 * 24 * 30,
  })
  jar.set(CUSTOMER_LOGGED_IN_COOKIE, "1", {
    httpOnly: false,
    secure: cookieSecure(config),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function readCustomerSession(): Promise<CustomerSessionTokens | null> {
  try {
    const config = getCustomerAccountConfig()
    const jar = await cookies()
    const raw = jar.get(CUSTOMER_SESSION_COOKIE)?.value
    if (!raw) return null
    const tokens = unseal<CustomerSessionTokens>(raw, config.sessionSecret)
    if (!tokens?.accessToken || !tokens.refreshToken || !tokens.idToken) {
      return null
    }
    return tokens
  } catch {
    return null
  }
}

export async function clearCustomerSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(CUSTOMER_SESSION_COOKIE)
  jar.delete(CUSTOMER_LOGGED_IN_COOKIE)
}

export async function isCustomerLoggedIn(): Promise<boolean> {
  const session = await readCustomerSession()
  return Boolean(session?.accessToken)
}

export async function readCartIdCookie(): Promise<string | null> {
  const jar = await cookies()
  const value = jar.get(CART_ID_COOKIE)?.value?.trim()
  return value || null
}
