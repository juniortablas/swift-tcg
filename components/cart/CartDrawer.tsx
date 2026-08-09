"use client"

import Image from "next/image"
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCart } from "@/lib/cart/useCart"
import type { CartItem } from "@/lib/cart/types"
import { formatUsdPrice } from "@/lib/pricing"
import { cn } from "@/lib/utils"

function formatPrice(price: number | null): string {
  if (typeof price !== "number") return "—"
  return formatUsdPrice(price)
}

function lineTotal(item: CartItem): number | null {
  if (typeof item.price !== "number") return null
  return item.price * item.quantity
}

export default function CartDrawer() {
  const {
    items,
    itemCount,
    subtotal,
    checkoutUrl,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCart()

  function handleCheckout() {
    if (!checkoutUrl) return
    window.location.assign(checkoutUrl)
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60]",
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close cart"
        className={cn(
          "absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 ease-out",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={closeCart}
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white shadow-[-8px_0_40px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-center justify-between border-b border-black/5 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-black">
              Bag
            </h2>
            <p className="mt-0.5 text-sm text-black/45">
              {itemCount === 0
                ? "Empty"
                : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close cart"
            className="size-11 text-black/50 hover:text-black sm:size-8"
            onClick={closeCart}
            tabIndex={isOpen ? 0 : -1}
          >
            <X />
          </Button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center sm:px-8">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
              <ShoppingBag className="size-6 text-black/35" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium tracking-tight text-black">
              Your bag is empty
            </p>
            <p className="mt-1.5 max-w-[240px] text-sm leading-relaxed text-black/45">
              Browse sealed products and preorders, then add them here when
              you&apos;re ready.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-6 h-11 bg-green-600 px-5 text-white hover:bg-green-600/90"
              onClick={closeCart}
              tabIndex={isOpen ? 0 : -1}
            >
              Continue shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-end px-4 pt-3 sm:px-6">
              <button
                type="button"
                className="min-h-10 px-1 text-xs font-medium text-black/40 transition-colors hover:text-black/70"
                onClick={clearCart}
                tabIndex={isOpen ? 0 : -1}
              >
                Clear all
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-4 py-2 sm:px-6 sm:py-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 border-b border-black/[0.04] py-3 last:border-b-0 sm:gap-4 sm:py-5"
                >
                  <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-50 to-neutral-100/80 sm:size-[72px]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        width={72}
                        height={72}
                        unoptimized
                        className="max-h-[80%] max-w-[80%] object-contain"
                      />
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm leading-snug font-medium tracking-tight text-black">
                        {item.title}
                      </h3>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-black">
                        {formatPrice(lineTotal(item))}
                      </p>
                    </div>

                    {typeof item.price === "number" && item.quantity > 1 ? (
                      <p className="mt-1 text-xs text-black/40 tabular-nums">
                        {formatPrice(item.price)} each
                      </p>
                    ) : null}

                    <div className="mt-auto flex items-center justify-between pt-2.5 sm:pt-3">
                      <div className="inline-flex items-center rounded-full border border-black/8 bg-neutral-50/80">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="flex size-10 items-center justify-center text-black/55 transition-colors hover:text-black disabled:opacity-30 sm:size-8"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          tabIndex={isOpen ? 0 : -1}
                        >
                          <Minus className="size-3.5" strokeWidth={2} />
                        </button>
                        <span className="min-w-7 text-center text-sm font-medium tabular-nums text-black">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.title}`}
                          className="flex size-10 items-center justify-center text-black/55 transition-colors hover:text-black disabled:opacity-30 sm:size-8"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={
                            item.quantityAvailable != null &&
                            item.quantityAvailable > 0 &&
                            item.quantity >= item.quantityAvailable
                          }
                          tabIndex={isOpen ? 0 : -1}
                        >
                          <Plus className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${item.title}`}
                        className="flex size-10 items-center justify-center rounded-full text-black/30 transition-colors hover:bg-black/5 hover:text-black/60 sm:size-8"
                        onClick={() => removeItem(item.id)}
                        tabIndex={isOpen ? 0 : -1}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-black/5 bg-white/90 px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6 sm:pb-6">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-black/50">Subtotal</span>
                <span className="text-lg font-semibold tracking-tight tabular-nums text-black">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-black/35">
                Shipping and tax calculated at checkout.
              </p>

              <Button
                type="button"
                size="lg"
                className="mt-4 h-12 w-full rounded-xl bg-green-600 text-[15px] font-semibold text-white hover:bg-green-600/90 disabled:opacity-40"
                onClick={handleCheckout}
                disabled={!checkoutUrl}
                tabIndex={isOpen ? 0 : -1}
              >
                Checkout
              </Button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
