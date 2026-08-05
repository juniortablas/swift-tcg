"use client"

import { ShoppingBag } from "lucide-react"

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
        <ShoppingBag />
        {count > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-semibold text-white tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      aria-label={label}
      className={cn(
        "relative ml-1 gap-1.5 bg-green-600 text-white hover:bg-green-600/90",
        className
      )}
      onClick={handleOpen}
    >
      <ShoppingBag />
      Cart
      {count > 0 ? (
        <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-semibold tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Button>
  )
}
