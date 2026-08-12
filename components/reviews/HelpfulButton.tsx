"use client"

import { useState, useTransition } from "react"
import { ThumbsUp } from "lucide-react"

import { redirectToCustomerLogin } from "@/lib/account/customerLogin"
import type { ReviewsMutationApiResponse } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"

type HelpfulButtonProps = {
  reviewId: string
  helpfulCount: number
  alreadyVoted?: boolean
  loggedIn?: boolean
  onVoted?: (helpfulCount: number) => void
  className?: string
}

export default function HelpfulButton({
  reviewId,
  helpfulCount,
  alreadyVoted = false,
  loggedIn = false,
  onVoted,
  className,
}: HelpfulButtonProps) {
  const [count, setCount] = useState(helpfulCount)
  const [voted, setVoted] = useState(alreadyVoted)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (voted || pending) return
    if (!loggedIn) {
      redirectToCustomerLogin()
      return
    }

    const previous = count
    setVoted(true)
    setCount(previous + 1)
    onVoted?.(previous + 1)

    startTransition(async () => {
      try {
        const numericId = reviewId.replace(/^gid:\/\/shopify\/Metaobject\//, "")
        const res = await fetch(`/api/reviews/${encodeURIComponent(numericId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "helpful" }),
        })
        const payload = (await res.json()) as ReviewsMutationApiResponse
        if (!res.ok) {
          setVoted(false)
          setCount(previous)
          onVoted?.(previous)
          return
        }
        if (typeof payload.helpfulCount === "number") {
          setCount(payload.helpfulCount)
          onVoted?.(payload.helpfulCount)
        }
        if (payload.voted === false) {
          setVoted(true)
        }
      } catch {
        setVoted(false)
        setCount(previous)
        onVoted?.(previous)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={voted || pending}
      aria-pressed={voted}
      aria-label={
        voted
          ? `Marked helpful (${count})`
          : `Mark review helpful (${count})`
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] px-3 py-1.5 text-xs font-medium transition-colors",
        voted
          ? "border-green-600/30 bg-green-50 text-green-700"
          : "bg-white text-black/60 hover:border-black/20 hover:text-black",
        "disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40",
        className
      )}
    >
      <ThumbsUp
        className={cn("size-3.5", voted ? "fill-current" : "")}
        aria-hidden="true"
      />
      Helpful ({count})
    </button>
  )
}
