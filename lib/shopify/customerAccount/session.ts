/**
 * Signed httpOnly cookie session for Customer Account tokens.
 * Auth remains Shopify-managed; we only store tokens issued by Shopify.
 *
 * Tokens are split across cookies so a single Set-Cookie stays under the
 * ~4KB browser limit (access + refresh + id JWT together often exceed it).
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

import {
  getCustomerAccountConfig,
  type CustomerAccountConfig,
} from "./config"
import type { PkceAuthState } from "./pkce"

/** @deprecated Legacy single-cookie session — still cleared on logout. */
export const CUSTOMER_SESSION_COOKIE = "swift_ca_session"
export const CUSTOMER_ACCESS_COOKIE = "swift_ca_access"
export const CUSTOMER_REFRESH_COOKIE = "swift_ca_refresh"
export const CUSTOMER_ID_TOKEN_COOKIE = "swift_ca_id"
export const CUSTOMER_PKCE_COOKIE = "swift_ca_pkce"
/** Non-sensitive flag for middleware soft-gate (not auth). */
export const CUSTOMER_LOGGED_IN_COOKIE = "swift_ca_logged_in"
export const CART_ID_COOKIE = "swift-tcg-shopify-cart-id"

const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export type CustomerSessionTokens = {
  accessToken: string
  refreshToken: string
  idToken: string
  /** Epoch ms when the access token expires. */
  expiresAt: number
}

type AccessCookiePayload = {
  accessToken: string
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

/**
 * Expire a cookie with the same attributes used when setting it.
 * `cookies().delete(name)` omits Secure/SameSite, so browsers keep Secure cookies.
 */
function expireCookie(
  jar: Awaited<ReturnType<typeof cookies>>,
  name: string,
  config: CustomerAccountConfig,
  httpOnly = true
): void {
  jar.set(name, "", {
    httpOnly,
    secure: cookieSecure(config),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
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
  const config = getCustomerAccountConfig()
  const jar = await cookies()
  expireCookie(jar, CUSTOMER_PKCE_COOKIE, config)
}

export async function setCustomerSession(
  tokens: CustomerSessionTokens
): Promise<void> {
  const config = getCustomerAccountConfig()
  const jar = await cookies()
  const secret = config.sessionSecret
  const secureOpts = baseCookieOptions(config)

  jar.set(
    CUSTOMER_ACCESS_COOKIE,
    seal(
      {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      } satisfies AccessCookiePayload,
      secret
    ),
    { ...secureOpts, maxAge: SESSION_MAX_AGE }
  )
  jar.set(CUSTOMER_REFRESH_COOKIE, seal(tokens.refreshToken, secret), {
    ...secureOpts,
    maxAge: SESSION_MAX_AGE,
  })
  jar.set(CUSTOMER_ID_TOKEN_COOKIE, seal(tokens.idToken, secret), {
    ...secureOpts,
    maxAge: SESSION_MAX_AGE,
  })

  // Drop legacy monolithic cookie if present.
  expireCookie(jar, CUSTOMER_SESSION_COOKIE, config)

  jar.set(CUSTOMER_LOGGED_IN_COOKIE, "1", {
    httpOnly: false,
    secure: cookieSecure(config),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export async function readCustomerSession(): Promise<CustomerSessionTokens | null> {
  try {
    const config = getCustomerAccountConfig()
    const jar = await cookies()
    const secret = config.sessionSecret

    const accessRaw = jar.get(CUSTOMER_ACCESS_COOKIE)?.value
    const refreshRaw = jar.get(CUSTOMER_REFRESH_COOKIE)?.value
    const idRaw = jar.get(CUSTOMER_ID_TOKEN_COOKIE)?.value

    if (accessRaw && refreshRaw && idRaw) {
      const access = unseal<AccessCookiePayload>(accessRaw, secret)
      const refreshToken = unseal<string>(refreshRaw, secret)
      const idToken = unseal<string>(idRaw, secret)
      if (
        access?.accessToken &&
        typeof access.expiresAt === "number" &&
        refreshToken &&
        idToken
      ) {
        return {
          accessToken: access.accessToken,
          refreshToken,
          idToken,
          expiresAt: access.expiresAt,
        }
      }
      return null
    }

    // Backward-compatible read of the old single session cookie.
    const legacy = jar.get(CUSTOMER_SESSION_COOKIE)?.value
    if (!legacy) return null
    const tokens = unseal<CustomerSessionTokens>(legacy, secret)
    if (!tokens?.accessToken || !tokens.refreshToken || !tokens.idToken) {
      return null
    }
    return tokens
  } catch {
    return null
  }
}

export async function clearCustomerSession(): Promise<void> {
  const config = getCustomerAccountConfig()
  const jar = await cookies()
  expireCookie(jar, CUSTOMER_SESSION_COOKIE, config)
  expireCookie(jar, CUSTOMER_ACCESS_COOKIE, config)
  expireCookie(jar, CUSTOMER_REFRESH_COOKIE, config)
  expireCookie(jar, CUSTOMER_ID_TOKEN_COOKIE, config)
  expireCookie(jar, CUSTOMER_LOGGED_IN_COOKIE, config, false)
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
