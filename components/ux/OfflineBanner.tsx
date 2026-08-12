"use client"

import { useEffect, useState } from "react"

/**
 * Soft offline banner — avoids a blank screen when the network drops mid-session.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine)
    }
    sync()
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => {
      window.removeEventListener("online", sync)
      window.removeEventListener("offline", sync)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-amber-500/20 bg-amber-50 px-4 py-3 text-center shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.2)]"
    >
      <p className="text-sm font-medium text-amber-950">
        You&apos;re offline. Check your connection, then retry any action that
        failed.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 inline-flex h-9 items-center justify-center rounded-full bg-amber-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900/40 focus-visible:ring-offset-2"
      >
        Retry
      </button>
    </div>
  )
}
