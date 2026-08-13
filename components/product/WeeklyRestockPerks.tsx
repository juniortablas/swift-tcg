import { Check } from "lucide-react"

import { WEEKLY_RESTOCK_PERKS } from "@/lib/product/constants"

/**
 * Trust points shown below the Reserve Now button on weekly restock PDPs.
 */
export default function WeeklyRestockPerks() {
  return (
    <ul className="mt-3 space-y-1.5 sm:mt-4">
      {WEEKLY_RESTOCK_PERKS.map((point) => (
        <li
          key={point}
          className="flex items-start gap-2 text-sm text-black/60"
        >
          <Check
            className="mt-0.5 size-3.5 shrink-0 text-green-600"
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  )
}
