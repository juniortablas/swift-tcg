/**
 * Client-side customer session for cacheable storefront chrome.
 *
 * Pages must not await cookies/auth on the server. Providers hydrate
 * logged-in state after first paint via `/api/account/session`.
 */

"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import * as Sentry from "@sentry/nextjs"

type CustomerSessionValue = {
  /** True when a Customer Account session is present. */
  loggedIn: boolean
  /** False until the session probe finishes. */
  isHydrated: boolean
}

const CustomerSessionContext = createContext<CustomerSessionValue | null>(null)

type SessionApiResponse = {
  loggedIn?: boolean
  customerId?: string | null
  emailHash?: string | null
}

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function probe() {
      try {
        const res = await fetch("/api/account/session", { cache: "no-store" })
        const payload = (await res.json()) as SessionApiResponse
        if (cancelled) return
        const nextLoggedIn = Boolean(payload.loggedIn)
        setLoggedIn(nextLoggedIn)
        if (nextLoggedIn && payload.customerId) {
          Sentry.setUser({
            id: payload.customerId,
            email: payload.emailHash ?? undefined,
          })
        } else {
          Sentry.setUser(null)
        }
      } catch {
        if (!cancelled) {
          setLoggedIn(false)
          Sentry.setUser(null)
        }
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    }

    void probe()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <CustomerSessionContext.Provider value={{ loggedIn, isHydrated }}>
      {children}
    </CustomerSessionContext.Provider>
  )
}

export function useCustomerSession(): CustomerSessionValue {
  const value = useContext(CustomerSessionContext)
  if (!value) {
    return { loggedIn: false, isHydrated: false }
  }
  return value
}
