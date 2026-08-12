"use client"

import { Bell, BellOff, Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useBackInStock } from "@/lib/back-in-stock/useBackInStock"
import { cn } from "@/lib/utils"

type NotifyMeButtonProps = {
  productId: string
  className?: string
}

/**
 * Sold-out PDP CTA: one-click subscribe when logged in; login redirect otherwise.
 */
export default function NotifyMeButton({
  productId,
  className,
}: NotifyMeButtonProps) {
  const {
    isHydrated,
    isSubscribed,
    statusFor,
    lastError,
    subscribe,
    unsubscribe,
  } = useBackInStock()

  const subscribed = isSubscribed(productId)
  const status = statusFor(productId)
  const pending = status === "pending" || !isHydrated

  function handleClick() {
    if (pending) return
    if (subscribed) {
      unsubscribe(productId)
      return
    }
    subscribe(productId)
  }

  const label = pending
    ? subscribed
      ? "Updating…"
      : "Notifying…"
    : subscribed
      ? "Subscribed"
      : "Notify Me"

  return (
    <div className="flex w-full flex-col gap-2">
      <Button
        type="button"
        size="lg"
        disabled={pending && !isHydrated}
        onClick={handleClick}
        aria-pressed={subscribed}
        className={cn(
          "h-12 w-full rounded-full text-[15px] font-semibold transition-all duration-200 sm:h-[52px]",
          subscribed
            ? "border border-green-600/25 bg-green-50 text-green-800 hover:bg-green-100"
            : "bg-green-600 text-white shadow-[0_10px_28px_-14px_rgba(22,163,74,0.55)] hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-[0_14px_32px_-14px_rgba(22,163,74,0.6)]",
          className
        )}
      >
        <span className="inline-flex items-center gap-2">
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : subscribed ? (
            status === "success" ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <BellOff className="size-4" aria-hidden="true" />
            )
          ) : (
            <Bell className="size-4" aria-hidden="true" />
          )}
          {label}
        </span>
      </Button>
      {subscribed && status !== "error" ? (
        <p className="text-center text-xs text-black/50 sm:text-left">
          We&apos;ll email you when this returns. Tap again to unsubscribe.
        </p>
      ) : null}
      {status === "error" && lastError ? (
        <p className="text-center text-xs text-red-600 sm:text-left" role="alert">
          {lastError}
        </p>
      ) : null}
      {status === "success" && !subscribed ? (
        <p className="text-center text-xs text-black/50 sm:text-left">
          Alert removed.
        </p>
      ) : null}
    </div>
  )
}
