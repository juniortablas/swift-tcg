"use client"

import {
  createContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"

import MixedCartDialog from "@/components/cart/MixedCartDialog"

import {
  cartReducer,
  getItemCount,
  getSubtotal,
  initialCartState,
} from "./cartReducer"
import {
  isCartAddAllowed,
  normalizeCartItemKind,
  wouldCreateMixedCart,
} from "./mixedCart"
import type {
  AddItemInput,
  CartApiResponse,
  CartContextValue,
  CartState,
} from "./types"

/** Persists only the Shopify cart id — line items live on Shopify. */
export const CART_ID_STORAGE_KEY = "swift-tcg-shopify-cart-id"
export const CART_ID_COOKIE = "swift-tcg-shopify-cart-id"

export const CartContext = createContext<CartContextValue | null>(null)

function readStoredCartId(): string | null {
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
    if (!cartId) {
      document.cookie = `${CART_ID_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
      return
    }
    document.cookie = `${CART_ID_COOKIE}=${encodeURIComponent(cartId)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
  } catch {
    // Ignore cookie write failures.
  }
}

function writeStoredCartId(cartId: string | null) {
  try {
    if (!cartId) {
      window.localStorage.removeItem(CART_ID_STORAGE_KEY)
      // Clean up legacy full-cart JSON if present.
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

function payloadToState(payload: CartApiResponse): CartState {
  return {
    items: payload.items ?? [],
    cartId: payload.cartId,
    checkoutUrl: payload.checkoutUrl,
  }
}

async function cartGet(cartId: string): Promise<CartApiResponse> {
  const res = await fetch(`/api/cart?cartId=${encodeURIComponent(cartId)}`)
  return (await res.json()) as CartApiResponse
}

async function cartPost(
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

type CartProviderProps = {
  children: ReactNode
  /** When true, attach Customer Account token to the cart and use silent SSO checkout. */
  customerLoggedIn?: boolean
}

/**
 * Shopify-backed cart provider. Persist only the cart id locally;
 * Shopify Storefront Cart is the source of truth for lines.
 */
export function CartProvider({
  children,
  customerLoggedIn = false,
}: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState)
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [pendingItem, setPendingItem] = useState<AddItemInput | null>(null)
  const cartIdRef = useRef<string | null>(null)
  const syncChain = useRef(Promise.resolve())
  const attachedRef = useRef(false)

  function applyPayload(payload: CartApiResponse) {
    cartIdRef.current = payload.cartId
    writeStoredCartId(payload.cartId)
    dispatch({ type: "HYDRATE", payload: payloadToState(payload) })
  }

  function enqueue(task: () => Promise<void>) {
    syncChain.current = syncChain.current.then(task).catch(() => {
      // Errors are handled inside each task; keep the chain alive.
    })
  }

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const storedId = readStoredCartId()
      cartIdRef.current = storedId
      if (storedId) writeCartIdCookie(storedId)

      if (storedId) {
        try {
          const payload = await cartGet(storedId)
          if (!cancelled) {
            applyPayload(payload)
          }
        } catch {
          if (!cancelled) {
            writeStoredCartId(null)
            cartIdRef.current = null
            dispatch({ type: "HYDRATE", payload: initialCartState })
          }
        }
      }

      if (!cancelled) setIsHydrated(true)
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  // After sign-in (and on hydrate when already logged in), associate cart buyer identity.
  useEffect(() => {
    if (!isHydrated || !customerLoggedIn) return
    const cartId = cartIdRef.current
    if (!cartId || attachedRef.current) return

    const params = new URLSearchParams(window.location.search)
    const forceSync = params.get("cart_sync") === "1"

    enqueue(async () => {
      const result = await cartPost({
        action: "attachCustomer",
        cartId,
      })
      if (result.ok) {
        attachedRef.current = true
        applyPayload(result.payload)
      }
      if (forceSync) {
        params.delete("cart_sync")
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`
        window.history.replaceState({}, "", next)
      }
    })
  }, [isHydrated, customerLoggedIn])

  useEffect(() => {
    if (!isOpen && !pendingItem) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      if (pendingItem) {
        setPendingItem(null)
        return
      }
      setIsOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen, pendingItem])

  const checkoutUrl = (() => {
    const url = state.checkoutUrl ?? null
    if (!url || !customerLoggedIn) return url
    try {
      const parsed = new URL(url)
      if (!parsed.searchParams.has("sso")) {
        parsed.searchParams.set("sso", "silent")
      }
      return parsed.toString()
    } catch {
      const join = url.includes("?") ? "&" : "?"
      return `${url}${join}sso=silent`
    }
  })()

  function commitAdd(item: AddItemInput, options?: { skipMixedCheck?: boolean }) {
    const quantity = Math.max(1, item.quantity ?? 1)
    const status = normalizeCartItemKind(item.status)

    enqueue(async () => {
      const result = await cartPost({
        action: "add",
        cartId: cartIdRef.current,
        productId: item.id,
        quantity,
        status,
        skipMixedCheck: options?.skipMixedCheck === true,
      })

      if (result.ok) {
        applyPayload(result.payload)
        setIsOpen(true)
        return
      }

      if (result.code === "mixed_cart") {
        setIsOpen(false)
        setPendingItem({ ...item, quantity, status })
      }
      // sold_out / inventory / other: leave cart as-is
    })
  }

  const value: CartContextValue = {
    items: state.items,
    itemCount: getItemCount(state),
    subtotal: getSubtotal(state),
    checkoutUrl,
    isOpen,
    isHydrated,
    addItem: (item: AddItemInput) => {
      if (!isCartAddAllowed(item)) {
        return false
      }

      const normalized: AddItemInput = {
        ...item,
        status: normalizeCartItemKind(item.status),
      }

      if (wouldCreateMixedCart(state.items, normalized)) {
        setIsOpen(false)
        setPendingItem(normalized)
        return false
      }

      commitAdd(normalized)
      return true
    },
    removeItem: (id: string) => {
      const cartId = cartIdRef.current
      if (!cartId) return

      enqueue(async () => {
        const result = await cartPost({
          action: "remove",
          cartId,
          lineId: id,
        })
        if (result.ok) applyPayload(result.payload)
      })
    },
    updateQuantity: (id: string, quantity: number) => {
      const cartId = cartIdRef.current
      if (!cartId) return

      const line = state.items.find((item) => item.id === id)
      const available = line?.quantityAvailable
      if (
        available != null &&
        available > 0 &&
        quantity > available
      ) {
        return
      }

      enqueue(async () => {
        const result = await cartPost({
          action: "update",
          cartId,
          lineId: id,
          quantity,
        })
        if (result.ok) applyPayload(result.payload)
      })
    },
    clearCart: () => {
      const cartId = cartIdRef.current
      if (!cartId) {
        dispatch({ type: "HYDRATE", payload: initialCartState })
        return
      }

      enqueue(async () => {
        const result = await cartPost({
          action: "clear",
          cartId,
        })
        if (result.ok) applyPayload(result.payload)
      })
    },
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    toggleCart: () => setIsOpen((open) => !open),
  }

  function handleContinueShopping() {
    setPendingItem(null)
  }

  function handleClearAndAdd() {
    if (!pendingItem) return
    const item = pendingItem
    setPendingItem(null)

    enqueue(async () => {
      const cartId = cartIdRef.current
      if (cartId) {
        const cleared = await cartPost({ action: "clear", cartId })
        if (cleared.ok) {
          applyPayload(cleared.payload)
        }
      }

      const quantity = Math.max(1, item.quantity ?? 1)
      const status = normalizeCartItemKind(item.status)
      const result = await cartPost({
        action: "add",
        cartId: cartIdRef.current,
        productId: item.id,
        quantity,
        status,
        skipMixedCheck: true,
      })

      if (result.ok) {
        applyPayload(result.payload)
        setIsOpen(true)
      }
    })
  }

  return (
    <CartContext.Provider value={value}>
      {children}
      <MixedCartDialog
        open={pendingItem != null}
        onContinueShopping={handleContinueShopping}
        onClearAndAdd={handleClearAndAdd}
      />
    </CartContext.Provider>
  )
}
