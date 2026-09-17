"use client"

import type { ReviewSort } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"

const OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest rating" },
  { value: "lowest", label: "Lowest rating" },
]

type ReviewFiltersProps = {
  sort: ReviewSort
  onSortChange: (sort: ReviewSort) => void
  className?: string
}

export default function ReviewFilters({
  sort,
  onSortChange,
  className,
}: ReviewFiltersProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <p className="text-sm font-medium text-black/55">Customer reviews</p>
      <label className="flex items-center gap-2 text-sm text-black/60">
        <span className="sr-only sm:not-sr-only">Sort</span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as ReviewSort)}
          className="h-9 rounded-full border border-black/[0.08] bg-white px-3 text-sm font-medium text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
          aria-label="Sort reviews"
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
