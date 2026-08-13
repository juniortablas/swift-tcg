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
import { useCustomerSession } from "@/lib/account/CustomerSessionProvider"

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
import { weeklyRestockLimitMessage } from "@/lib/product/weeklyRestock"
import {
  cartGet,
  cartPost,
  mergePayloadWithPending,
  payloadToState,
  readStoredCartId,
  writeStoredCartId,
} from "./cartClient"
import { CART_ID_COOKIE, CART_ID_STORAGE_KEY } from "./constants"
import { createQuantityDebouncer } from "./quantityDebounce"
import type {
  AddItemInput,
  CartApiResponse,
  CartContextValue,
} from "./types"

export { CART_ID_STORAGE_KEY, CART_ID_COOKIE }

export const CartContext = createContext<CartContextValue | null>(null)

type CartProviderProps = {
  children: ReactNode
}

/**
 * Shopify-backed cart provider. Persist only the cart id locally;
 * Shopify Storefront Cart is the source of truth for lines.
 * Customer login is hydrated via CustomerSessionProvider (no SSR cookie wait).
 */
export function CartProvider({ children }: CartProviderProps) {
  const { loggedIn: customerLoggedIn, isHydrated: sessionHydrated } =
    useCustomerSession()
  const [state, dispatch] = useReducer(cartReducer, initialCartState)
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [pendingItem, setPendingItem] = useState<AddItemInput | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const cartIdRef = useRef<string | null>(null)
  const itemsRef = useRef(state.items)
  const syncChain = useRef(Promise.resolve())
  const attachedRef = useRef(false)
  const quantityDebouncer = useRef(createQuantityDebouncer())

  itemsRef.current = state.items

  function applyPayload(payload: CartApiResponse) {
    cartIdRef.current = payload.cartId
    writeStoredCartId(payload.cartId)
    const merged = mergePayloadWithPending(
      payload,
      quantityDebouncer.current.peek()
    )
    dispatch({ type: "HYDRATE", payload: payloadToState(merged) })
  }

  function enqueue(task: () => Promise<void>) {
    const next = syncChain.current.then(task).catch(() => {
      // Errors are handled inside each task; keep the chain alive.
    })
    syncChain.current = next
    return next
  }

  function flushQuantityUpdates() {
    const lines = quantityDebouncer.current.drain()
    if (lines.length === 0) return Promise.resolve()

    return enqueue(async () => {
      const cartId = cartIdRef.current
      if (!cartId) return

      const result = await cartPost({
        action: "update",
        cartId,
        lines,
      })

      if (result.ok) {
        setActionError(null)
        applyPayload(result.payload)
        return
      }

      try {
        applyPayload(await cartGet(cartId))
      } catch {
        // Keep optimistic lines if resync fails.
      }

      if (result.code === "inventory") {
        setActionError(
          result.payload.error?.message || "Not enough inventory."
        )
      } else if (result.code === "throttled") {
        setActionError(
          result.payload.error?.message ||
            "Too many requests. Please try again in a moment."
        )
      }
    })
  }

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const storedId = readStoredCartId()
      cartIdRef.current = storedId
      if (storedId) writeStoredCartId(storedId)

      if (storedId) {
        try {
          const payload = await cartGet(storedId)
          if (!cancelled) {
            applyPayload(payload)
          }
        } catch {
          if (!cancelled) {
            dispatch({ type: "HYDRATE", payload: initialCartState })
          }
        }
      }

      if (!cancelled) setIsHydrated(true)
    }

    void hydrate()
    return () => {
      cancelled = true
      quantityDebouncer.current.cancelTimer()
    }
  }, [])

  useEffect(() => {
    if (!isHydrated || !sessionHydrated || !customerLoggedIn) return
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
  }, [isHydrated, sessionHydrated, customerLoggedIn])

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
        setActionError(null)
        applyPayload(result.payload)
        setIsOpen(true)
        return
      }

      if (result.code === "mixed_cart") {
        setIsOpen(false)
        setPendingItem({ ...item, quantity, status })
        return
      }

      if (result.code === "inventory" || result.code === "sold_out") {
        setActionError(
          result.payload.error?.message || "This product is sold out."
        )
        return
      }

      if (result.code === "throttled") {
        setActionError(
          result.payload.error?.message ||
            "Too many requests. Please try again in a moment."
        )
      }
    })
  }

  const value: CartContextValue = {
    items: state.items,
    itemCount: getItemCount(state),
    subtotal: getSubtotal(state),
    checkoutUrl,
    isOpen,
    isHydrated,
    actionError,
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

      quantityDebouncer.current.peek().delete(id)
      dispatch({ type: "SET_LINE_QUANTITY", lineId: id, quantity: 0 })

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

      const line = itemsRef.current.find((item) => item.id === id)
      const available = line?.quantityAvailable
      if (line?.weeklyRestock) {
        if (available != null && quantity > available) {
          setActionError(weeklyRestockLimitMessage(available))
          return
        }
      } else if (
        available != null &&
        available > 0 &&
        quantity > available
      ) {
        return
      }

      dispatch({ type: "SET_LINE_QUANTITY", lineId: id, quantity })
      quantityDebouncer.current.set(id, quantity)
      quantityDebouncer.current.schedule(() => {
        void flushQuantityUpdates()
      })
    },
    clearCart: () => {
      const cartId = cartIdRef.current
      quantityDebouncer.current.drain()
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
    prepareCheckout: async () => {
      await flushQuantityUpdates()
      const cartId = cartIdRef.current
      if (!cartId) return false

      let allowed = false
      await enqueue(async () => {
        const result = await cartPost({
          action: "prepareCheckout",
          cartId,
        })
        if (result.ok) {
          setActionError(null)
          applyPayload(result.payload)
          allowed = true
          return
        }
        if (result.payload.items?.length) {
          applyPayload(result.payload)
        }
        setActionError(
          result.payload.error?.message ||
            "Reservation availability changed. Please review your bag."
        )
      })
      return allowed
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
