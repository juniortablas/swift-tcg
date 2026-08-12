"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Surfaces a generic sign-in failure after OAuth redirects home with
 * `?account_error=1`. Strips the query so it is not indexed or shared.
 */
function AccountAuthErrorBannerInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (searchParams.get("account_error") !== "1") return
    setVisible(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("account_error")
    const next = `${pathname}${params.toString() ? `?${params}` : ""}`
    window.history.replaceState({}, "", next)
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div
      role="alert"
      className="border-b border-red-200 bg-red-50 px-4 py-3 text-center"
    >
      <p className="text-sm font-medium text-red-950">
        We couldn&apos;t complete sign-in. Please try again.
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="mt-2 inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold text-red-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-900/30"
      >
        Dismiss
      </button>
    </div>
  )
}

export default function AccountAuthErrorBanner() {
  return (
    <Suspense fallback={null}>
      <AccountAuthErrorBannerInner />
    </Suspense>
  )
}
