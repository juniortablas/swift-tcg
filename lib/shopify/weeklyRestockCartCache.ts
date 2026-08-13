/**
 * Per-cart reservation remaining cache.
 *
 * Remaining is computed from product metafields when the cart loads, a
 * reservation line is first added, checkout starts, or this TTL expires.
 * Quantity mutations reuse this snapshot — they never hit Admin GraphQL
 * or re-read reservation metafields.
 */

import type { CartItem } from "@/lib/cart/types"
import { RESERVATION_CACHE_TTL_MS } from "@/lib/product/weeklyRestock"

type CartLike = {
  cartId: string | null
  items: CartItem[]
}

export const RESERVATION_SESSION_COOKIE = "swift-tcg-wr-remaining"

export type ReservationLineCache = {
  productId: string
  remaining: number
  limit: number
  cachedAt: number
}

export type ReservationSession = {
  cartId: string
  cachedAt: number
  lines: Record<string, ReservationLineCache>
}

const memoryByCartId = new Map<string, ReservationSession>()

function now(): number {
  return Date.now()
}

export function isReservationSessionFresh(
  session: ReservationSession | null | undefined,
  cartId?: string
): session is ReservationSession {
  if (!session?.cartId) return false
  if (cartId && session.cartId !== cartId) return false
  return now() - session.cachedAt < RESERVATION_CACHE_TTL_MS
}

export function sessionFromCartPayload(
  payload: CartLike
): ReservationSession | null {
  if (!payload.cartId) return null

  const lines: Record<string, ReservationLineCache> = {}
  const cachedAt = now()
  for (const item of payload.items) {
    if (!item.weeklyRestock) continue
    lines[item.id] = {
      productId: item.productId,
      remaining: item.quantityAvailable ?? 0,
      limit: item.weeklyRestockLimit ?? 0,
      cachedAt,
    }
  }

  return { cartId: payload.cartId, cachedAt, lines }
}

export function rememberReservationSession(
  session: ReservationSession | null | undefined
): void {
  if (!session?.cartId) return
  memoryByCartId.set(session.cartId, session)
}

export function peekReservationSession(
  cartId: string
): ReservationSession | null {
  const session = memoryByCartId.get(cartId) ?? null
  if (!isReservationSessionFresh(session, cartId)) {
    if (session) memoryByCartId.delete(cartId)
    return null
  }
  return session
}

export function resolveReservationSession(
  cartId: string,
  cookieSession?: ReservationSession | null
): ReservationSession | null {
  const memory = peekReservationSession(cartId)
  if (memory) return memory
  if (isReservationSessionFresh(cookieSession, cartId)) {
    rememberReservationSession(cookieSession)
    return cookieSession
  }
  return null
}

export function overlayReservationRemaining<T extends CartLike>(
  payload: T,
  session: ReservationSession | null | undefined
): T {
  if (!payload.cartId) return payload

  const fresh = isReservationSessionFresh(session, payload.cartId)
    ? session
    : peekReservationSession(payload.cartId)

  if (!fresh) return payload

  const items: CartItem[] = payload.items.map((item) => {
    if (!item.weeklyRestock) return item
    const cached =
      fresh.lines[item.id] ??
      Object.values(fresh.lines).find(
        (line) => line.productId === item.productId
      )
    if (!cached) return item
    return {
      ...item,
      quantityAvailable: cached.remaining,
      weeklyRestockLimit: cached.limit || item.weeklyRestockLimit,
    }
  })

  const next = { ...payload, items }
  rememberReservationSession(sessionFromCartPayload(next))
  return next
}

export function parseReservationSessionCookie(
  value: string | null | undefined
): ReservationSession | null {
  if (!value?.trim()) return null
  const candidates = [value]
  try {
    candidates.push(decodeURIComponent(value))
  } catch {
    // Cookie was not percent-encoded.
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<ReservationSession>
      if (!parsed.cartId || typeof parsed.cachedAt !== "number") continue
      const lines: Record<string, ReservationLineCache> = {}
      if (parsed.lines && typeof parsed.lines === "object") {
        for (const [lineId, line] of Object.entries(parsed.lines)) {
          if (!line || typeof line.productId !== "string") continue
          if (typeof line.remaining !== "number" || typeof line.cachedAt !== "number") {
            continue
          }
          lines[lineId] = {
            productId: line.productId,
            remaining: line.remaining,
            limit: typeof line.limit === "number" ? line.limit : 0,
            cachedAt: line.cachedAt,
          }
        }
      }
      return { cartId: parsed.cartId, cachedAt: parsed.cachedAt, lines }
    } catch {
      continue
    }
  }
  return null
}

export function serializeReservationSessionCookie(
  session: ReservationSession
): string {
  return encodeURIComponent(JSON.stringify(session))
}

export function reservationCookieOptions(): {
  httpOnly: true
  sameSite: "lax"
  path: string
  maxAge: number
  secure?: boolean
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.ceil(RESERVATION_CACHE_TTL_MS / 1000),
  }
}
