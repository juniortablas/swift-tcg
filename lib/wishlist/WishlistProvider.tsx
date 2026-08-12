"use client"

import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { redirectToCustomerLogin } from "@/lib/account/customerLogin"
import { WISHLIST_PENDING_STORAGE_KEY } from "@/lib/wishlist/constants"
import type {
  WishlistApiResponse,
  WishlistContextValue,
} from "@/lib/wishlist/types"

export const WishlistContext = createContext<WishlistContextValue | null>(null)

type WishlistProviderProps = {
  children: ReactNode
  customerLoggedIn?: boolean
}

function redirectToLogin(productId?: string) {
  redirectToCustomerLogin(
    productId
      ? {
          pending: {
            key: WISHLIST_PENDING_STORAGE_KEY,
            value: productId,
          },
        }
      : undefined
  )
}

async function wishlistGet(): Promise<WishlistApiResponse> {
  const res = await fetch("/api/wishlist", { cache: "no-store" })
  return (await res.json()) as WishlistApiResponse
}

async function wishlistPost(body: {
  action: "toggle" | "add" | "remove"
  productId: string
}): Promise<{ ok: boolean; status: number; payload: WishlistApiResponse }> {
  const res = await fetch("/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = (await res.json()) as WishlistApiResponse
  return { ok: res.ok, status: res.status, payload }
}

/**
 * Shopify-backed wishlist provider. Product GIDs live on the customer
 * metafield; this provider mirrors them with optimistic client updates.
 */
export function WishlistProvider({
  children,
  customerLoggedIn = false,
}: WishlistProviderProps) {
  const [productIds, setProductIds] = useState<string[]>([])
  const [loggedIn, setLoggedIn] = useState(customerLoggedIn)
  const [isHydrated, setIsHydrated] = useState(false)
  const idsRef = useRef<string[]>([])
  const syncChain = useRef(Promise.resolve())

  function applyIds(next: string[]) {
    idsRef.current = next
    setProductIds(next)
  }

  function enqueue(task: () => Promise<void>) {
    syncChain.current = syncChain.current.then(task).catch(() => {
      // Errors handled inside each task; keep the chain alive.
    })
  }

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const payload = await wishlistGet()
        if (cancelled) return
        setLoggedIn(payload.loggedIn)
        applyIds(payload.productIds ?? [])
      } catch {
        if (!cancelled) {
          setLoggedIn(customerLoggedIn)
          applyIds([])
        }
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [customerLoggedIn])

  // After login, apply a heart click that triggered the auth redirect.
  useEffect(() => {
    if (!isHydrated || !loggedIn) return

    let pending: string | null = null
    try {
      pending = window.sessionStorage.getItem(WISHLIST_PENDING_STORAGE_KEY)
      if (pending) {
        window.sessionStorage.removeItem(WISHLIST_PENDING_STORAGE_KEY)
      }
    } catch {
      pending = null
    }

    if (!pending || idsRef.current.includes(pending)) return

    const productId = pending
    const previous = idsRef.current
    applyIds([productId, ...previous.filter((id) => id !== productId)])

    enqueue(async () => {
      const result = await wishlistPost({ action: "add", productId })
      if (result.status === 401) {
        applyIds(previous)
        redirectToLogin(productId)
        return
      }
      if (result.ok) {
        applyIds(result.payload.productIds ?? [])
        return
      }
      applyIds(previous)
    })
  }, [isHydrated, loggedIn])

  function mutate(
    productId: string,
    action: "toggle" | "add" | "remove"
  ) {
    if (!loggedIn) {
      redirectToLogin(productId)
      return
    }

    const previous = idsRef.current
    const exists = previous.includes(productId)
    let optimistic = previous

    if (action === "remove" || (action === "toggle" && exists)) {
      optimistic = previous.filter((id) => id !== productId)
    } else if (!exists) {
      optimistic = [productId, ...previous]
    }

    applyIds(optimistic)

    enqueue(async () => {
      const result = await wishlistPost({ action, productId })
      if (result.status === 401) {
        applyIds(previous)
        setLoggedIn(false)
        redirectToLogin(productId)
        return
      }
      if (result.ok) {
        applyIds(result.payload.productIds ?? [])
        return
      }
      applyIds(previous)
    })
  }

  const value: WishlistContextValue = {
    productIds,
    isHydrated,
    loggedIn,
    isInWishlist: (productId: string) => idsRef.current.includes(productId) || productIds.includes(productId),
    toggle: (productId: string) => mutate(productId, "toggle"),
    remove: (productId: string) => mutate(productId, "remove"),
    add: (productId: string) => mutate(productId, "add"),
  }

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  )
}
