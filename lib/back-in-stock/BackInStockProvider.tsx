"use client"

import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { redirectToCustomerLogin } from "@/lib/account/customerLogin"
import { BIS_PENDING_STORAGE_KEY } from "@/lib/back-in-stock/constants"
import type {
  BisApiResponse,
  BisContextValue,
  BisSubscriptionView,
} from "@/lib/back-in-stock/types"

export const BackInStockContext = createContext<BisContextValue | null>(null)

type BackInStockProviderProps = {
  children: ReactNode
  customerLoggedIn?: boolean
}

type ProductStatus = "idle" | "pending" | "success" | "error"

function redirectToLogin(productId?: string) {
  redirectToCustomerLogin(
    productId
      ? {
          pending: {
            key: BIS_PENDING_STORAGE_KEY,
            value: productId,
          },
        }
      : undefined
  )
}

async function bisGet(): Promise<BisApiResponse> {
  const res = await fetch("/api/back-in-stock", { cache: "no-store" })
  return (await res.json()) as BisApiResponse
}

async function bisPost(body: {
  action: "toggle" | "add" | "remove"
  productId: string
}): Promise<{ ok: boolean; status: number; payload: BisApiResponse }> {
  const res = await fetch("/api/back-in-stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = (await res.json()) as BisApiResponse
  return { ok: res.ok, status: res.status, payload }
}

function applyPayload(
  payload: BisApiResponse
): { productIds: string[]; subscriptions: BisSubscriptionView[] } {
  const subscriptions = payload.subscriptions ?? []
  const productIds =
    payload.productIds ?? subscriptions.map((item) => item.productId)
  return { productIds, subscriptions }
}

/**
 * Shopify-backed back-in-stock provider with optimistic client updates.
 */
export function BackInStockProvider({
  children,
  customerLoggedIn = false,
}: BackInStockProviderProps) {
  const [productIds, setProductIds] = useState<string[]>([])
  const [subscriptions, setSubscriptions] = useState<BisSubscriptionView[]>([])
  const [loggedIn, setLoggedIn] = useState(customerLoggedIn)
  const [isHydrated, setIsHydrated] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, ProductStatus>>({})
  const [lastError, setLastError] = useState<string | null>(null)

  const idsRef = useRef<string[]>([])
  const subsRef = useRef<BisSubscriptionView[]>([])
  const syncChain = useRef(Promise.resolve())

  function applyState(next: {
    productIds: string[]
    subscriptions: BisSubscriptionView[]
  }) {
    idsRef.current = next.productIds
    subsRef.current = next.subscriptions
    setProductIds(next.productIds)
    setSubscriptions(next.subscriptions)
  }

  function setStatus(productId: string, status: ProductStatus) {
    setStatuses((prev) => ({ ...prev, [productId]: status }))
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
        const payload = await bisGet()
        if (cancelled) return
        setLoggedIn(payload.loggedIn)
        applyState(applyPayload(payload))
      } catch {
        if (!cancelled) {
          setLoggedIn(customerLoggedIn)
          applyState({ productIds: [], subscriptions: [] })
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

  // After login, apply a Notify Me click that triggered the auth redirect.
  useEffect(() => {
    if (!isHydrated || !loggedIn) return

    let pending: string | null = null
    try {
      pending = window.sessionStorage.getItem(BIS_PENDING_STORAGE_KEY)
      if (pending) {
        window.sessionStorage.removeItem(BIS_PENDING_STORAGE_KEY)
      }
    } catch {
      pending = null
    }

    if (!pending || idsRef.current.includes(pending)) return

    const productId = pending
    const previousIds = idsRef.current
    const previousSubs = subsRef.current
    const subscribedAt = new Date().toISOString()

    applyState({
      productIds: [productId, ...previousIds.filter((id) => id !== productId)],
      subscriptions: [
        { productId, subscribedAt },
        ...previousSubs.filter((s) => s.productId !== productId),
      ],
    })
    setStatus(productId, "pending")
    setLastError(null)

    enqueue(async () => {
      const result = await bisPost({ action: "add", productId })
      if (result.status === 401) {
        applyState({ productIds: previousIds, subscriptions: previousSubs })
        setStatus(productId, "error")
        redirectToLogin(productId)
        return
      }
      if (result.ok) {
        applyState(applyPayload(result.payload))
        setStatus(productId, "success")
        return
      }
      applyState({ productIds: previousIds, subscriptions: previousSubs })
      setStatus(productId, "error")
      setLastError(result.payload.error?.message ?? "Unable to subscribe.")
    })
  }, [isHydrated, loggedIn])

  function mutate(productId: string, action: "toggle" | "add" | "remove") {
    if (!loggedIn) {
      redirectToLogin(productId)
      return
    }

    const previousIds = idsRef.current
    const previousSubs = subsRef.current
    const exists = previousIds.includes(productId)

    let nextIds = previousIds
    let nextSubs = previousSubs

    if (action === "remove" || (action === "toggle" && exists)) {
      nextIds = previousIds.filter((id) => id !== productId)
      nextSubs = previousSubs.filter((s) => s.productId !== productId)
    } else if (!exists) {
      const subscribedAt = new Date().toISOString()
      nextIds = [productId, ...previousIds]
      nextSubs = [{ productId, subscribedAt }, ...previousSubs]
    }

    applyState({ productIds: nextIds, subscriptions: nextSubs })
    setStatus(productId, "pending")
    setLastError(null)

    enqueue(async () => {
      const result = await bisPost({ action, productId })
      if (result.status === 401) {
        applyState({ productIds: previousIds, subscriptions: previousSubs })
        setLoggedIn(false)
        setStatus(productId, "error")
        redirectToLogin(productId)
        return
      }
      if (result.ok) {
        applyState(applyPayload(result.payload))
        setStatus(productId, "success")
        return
      }
      applyState({ productIds: previousIds, subscriptions: previousSubs })
      setStatus(productId, "error")
      setLastError(result.payload.error?.message ?? "Unable to update alert.")
    })
  }

  const value: BisContextValue = {
    productIds,
    subscriptions,
    isHydrated,
    loggedIn,
    isSubscribed: (productId: string) =>
      idsRef.current.includes(productId) || productIds.includes(productId),
    statusFor: (productId: string) => statuses[productId] ?? "idle",
    lastError,
    subscribe: (productId: string) => mutate(productId, "add"),
    unsubscribe: (productId: string) => mutate(productId, "remove"),
    toggle: (productId: string) => mutate(productId, "toggle"),
  }

  return (
    <BackInStockContext.Provider value={value}>
      {children}
    </BackInStockContext.Provider>
  )
}
