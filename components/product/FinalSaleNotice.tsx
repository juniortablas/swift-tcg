import { Info } from "lucide-react"

import { FINAL_SALE_NOTICE } from "@/lib/product/constants"

/**
 * Subtle final-sale policy note for the PDP purchase panel.
 * Presentational only — no client state or interactivity.
 */
export default function FinalSaleNotice() {
  return (
    <aside
      aria-labelledby="final-sale-heading"
      className="mt-4 rounded-[14px] border border-black/[0.06] bg-[#fafafa] px-3 py-2.5 sm:mt-5 sm:rounded-[17px] sm:px-3.5 sm:py-3"
    >
      <div className="flex items-start gap-2.5">
        <Info
          className="mt-0.5 size-3.5 shrink-0 text-black/50"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2
            id="final-sale-heading"
            className="text-[12px] font-semibold tracking-tight text-black"
          >
            {FINAL_SALE_NOTICE.title}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-black/70 sm:text-[13px]">
            {FINAL_SALE_NOTICE.body}
          </p>
        </div>
      </div>
    </aside>
  )
}
