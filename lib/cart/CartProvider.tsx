"use client"

import {
  createContext,
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react"

import {
  cartReducer,
  getItemCount,
  getSubtotal,
  initialCartState,
} from "./cartReducer"
import type { AddItemInput, CartContextValue, CartState } from "./types"

export const CART_STORAGE_KEY = "swift-tcg-cart"

export const CartContext = createContext<CartContextValue | null>(null)

function readStoredCart(): CartState | null {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as unknown
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("items" in parsed) ||
      !Array.isArray((parsed as CartState).items)
    ) {
      return null
    }

    return { items: (parsed as CartState).items }
  } catch {
    return null
  }
}

type CartProviderProps = {
  children: ReactNode
}

/**
 * Local cart provider. Swap the persistence / mutation layer for Shopify
 * later while keeping the same context API for consumers.
 */
export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState)
  const [isOpen, setIsOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const stored = readStoredCart()
    if (stored) {
      dispatch({ type: "HYDRATE", payload: stored })
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, [state, isHydrated])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen])

  const value: CartContextValue = {
    items: state.items,
    itemCount: getItemCount(state),
    subtotal: getSubtotal(state),
    isOpen,
    isHydrated,
    addItem: (item: AddItemInput) => {
      dispatch({ type: "ADD_ITEM", payload: item })
      setIsOpen(true)
    },
    removeItem: (id: string) => {
      dispatch({ type: "REMOVE_ITEM", payload: { id } })
    },
    updateQuantity: (id: string, quantity: number) => {
      dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } })
    },
    clearCart: () => {
      dispatch({ type: "CLEAR_CART" })
    },
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    toggleCart: () => setIsOpen((open) => !open),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
