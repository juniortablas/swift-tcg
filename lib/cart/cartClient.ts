import { CART_ID_COOKIE, CART_ID_STORAGE_KEY } from "./constants"
import type { CartApiResponse, CartState } from "./types"
import { mergePendingQuantities } from "./quantityDebounce"

export function readStoredCartId(): string | null {
  try {
    const raw = window.localStorage.getItem(CART_ID_STORAGE_KEY)
    if (!raw) return null
    const trimmed = raw.trim()
    return trimmed || null
  } catch {
    return null
  }
}

function writeCartIdCookie(cartId: string | null) {
  try {
    const secure =
      window.location.protocol === "https:" ? "; Secure" : ""
    if (!cartId) {
      document.cookie = `${CART_ID_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
      return
    }
    document.cookie = `${CART_ID_COOKIE}=${encodeURIComponent(cartId)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`
  } catch {
    // Ignore cookie write failures.
  }
}

export function writeStoredCartId(cartId: string | null) {
  try {
    if (!cartId) {
      window.localStorage.removeItem(CART_ID_STORAGE_KEY)
      window.localStorage.removeItem("swift-tcg-cart")
      writeCartIdCookie(null)
      return
    }
    window.localStorage.setItem(CART_ID_STORAGE_KEY, cartId)
    window.localStorage.removeItem("swift-tcg-cart")
    writeCartIdCookie(cartId)
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function payloadToState(payload: CartApiResponse): CartState {
  return {
    items: payload.items ?? [],
    cartId: payload.cartId,
    checkoutUrl: payload.checkoutUrl,
  }
}

export function mergePayloadWithPending(
  payload: CartApiResponse,
  pending: Map<string, number>
): CartApiResponse {
  if (pending.size === 0) return payload
  const items = mergePendingQuantities(payload.items ?? [], pending)
  return {
    ...payload,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => {
      if (typeof item.price !== "number") return sum
      return sum + item.price * item.quantity
    }, 0),
  }
}

export async function cartGet(cartId: string): Promise<CartApiResponse> {
  const res = await fetch(`/api/cart?cartId=${encodeURIComponent(cartId)}`)
  const payload = (await res.json()) as CartApiResponse
  if (!res.ok) {
    const error = new Error(payload.error?.message || "Cart fetch failed.")
    ;(error as Error & { status?: number }).status = res.status
    throw error
  }
  return payload
}

export async function cartPost(
  body: Record<string, unknown>
): Promise<{ ok: boolean; payload: CartApiResponse; code?: string }> {
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = (await res.json()) as CartApiResponse
  return {
    ok: res.ok,
    payload,
    code: payload.error?.code,
  }
}
