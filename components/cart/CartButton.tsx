"use client"

import { ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart/useCart"
import { cn } from "@/lib/utils"

type CartButtonProps = {
  className?: string
  /** Compact icon-only control (mobile). */
  iconOnly?: boolean
  /** Called when the cart is opened (e.g. close the mobile nav). */
  onOpen?: () => void
}

export default function CartButton({
  className,
  iconOnly = false,
  onOpen,
}: CartButtonProps) {
  const { itemCount, isHydrated, openCart } = useCart()
  const count = isHydrated ? itemCount : 0
  const label =
    count > 0 ? `Open cart, ${count} ${count === 1 ? "item" : "items"}` : "Open cart"

  function handleOpen() {
    onOpen?.()
    openCart()
  }

  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        className={cn("relative text-black/70 hover:text-black", className)}
        onClick={handleOpen}
      >
        <ShoppingCart />
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-semibold text-white tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      aria-label={label}
      className={cn(
        "relative ml-1 h-10 gap-2 rounded-full bg-green-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_rgba(22,163,74,0.55)] transition-transform duration-200 hover:scale-[1.03] hover:bg-green-600/90",
        className
      )}
      onClick={handleOpen}
    >
      <ShoppingCart className="size-4" />
      Cart
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-green-700 tabular-nums">
        {count > 99 ? "99+" : count}
      </span>
    </Button>
  )
}
