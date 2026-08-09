"use client"

import { Button } from "@/components/ui/button"
import { MIXED_CART_MESSAGE } from "@/lib/cart/mixedCart"

type MixedCartDialogProps = {
  open: boolean
  onContinueShopping: () => void
  onClearAndAdd: () => void
}

export default function MixedCartDialog({
  open,
  onContinueShopping,
  onClearAndAdd,
}: MixedCartDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onContinueShopping}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="mixed-cart-title"
        aria-describedby="mixed-cart-description"
        className="absolute inset-x-4 top-[20%] mx-auto w-auto max-w-md rounded-[20px] bg-white p-6 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.35)] sm:inset-x-6 sm:p-7"
      >
        <h2
          id="mixed-cart-title"
          className="text-[17px] font-semibold tracking-tight text-black"
        >
          Separate checkout required
        </h2>
        <p
          id="mixed-cart-description"
          className="mt-2 text-sm leading-relaxed text-black/55"
        >
          {MIXED_CART_MESSAGE}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
          <Button
            type="button"
            size="lg"
            className="h-11 w-full rounded-xl bg-green-600 text-[14px] font-semibold text-white hover:bg-green-600/90 sm:flex-1"
            onClick={onClearAndAdd}
          >
            Clear cart and add item
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-xl border-black/10 text-[14px] font-semibold text-black hover:bg-neutral-50 sm:flex-1"
            onClick={onContinueShopping}
          >
            Continue shopping
          </Button>
        </div>
      </div>
    </div>
  )
}
