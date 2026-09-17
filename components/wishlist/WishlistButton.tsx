"use client"

import { Heart } from "lucide-react"

import { useWishlist } from "@/lib/wishlist/useWishlist"
import { cn } from "@/lib/utils"

type WishlistButtonProps = {
  productId: string
  /** Visual size / placement variant. */
  variant?: "card" | "pdp"
  className?: string
}

/**
 * Heart toggle for product cards and PDP. Guests are sent to Customer
 * Account login and returned to the same page; pending adds apply after auth.
 */
export default function WishlistButton({
  productId,
  variant = "card",
  className,
}: WishlistButtonProps) {
  const { isInWishlist, toggle, isHydrated } = useWishlist()
  const active = isHydrated && isInWishlist(productId)

  function handleClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    toggle(productId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-black/[0.08] bg-white/95 text-black shadow-[0_4px_14px_-8px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-[transform,background-color,color] duration-200 hover:scale-[1.04] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:ring-offset-2",
        variant === "card" && "size-8 sm:size-9",
        variant === "pdp" && "size-11 sm:size-12",
        active && "border-indigo-600/20 text-indigo-700",
        className
      )}
    >
      <Heart
        className={cn(
          variant === "card" ? "size-3.5 sm:size-4" : "size-5",
          active && "fill-current"
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
    </button>
  )
}
