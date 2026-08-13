import { Info } from "lucide-react"

import { WEEKLY_RESTOCK_CART_NOTICE } from "@/lib/product/constants"

/**
 * Cart notice when any line is a weekly restock reservation.
 * Does not block checkout.
 */
export default function ReserveItemNotice() {
  return (
    <aside
      aria-labelledby="reserve-item-heading"
      className="rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 sm:rounded-[17px] sm:px-3.5 sm:py-3"
    >
      <div className="flex items-start gap-2.5">
        <Info
          className="mt-0.5 size-3.5 shrink-0 text-black/50"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h3
            id="reserve-item-heading"
            className="text-[12px] font-semibold tracking-tight text-black"
          >
            {WEEKLY_RESTOCK_CART_NOTICE.title}
          </h3>
          {WEEKLY_RESTOCK_CART_NOTICE.body.map((paragraph) => (
            <p
              key={paragraph}
              className="mt-0.5 text-xs leading-relaxed text-black/70"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </aside>
  )
}
