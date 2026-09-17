"use client"

import ReviewStars from "@/components/reviews/ReviewStars"
import type { ReviewSummary as ReviewSummaryType } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"

type ReviewSummaryProps = {
  summary: ReviewSummaryType
  onWriteReview?: () => void
  writeDisabled?: boolean
  writeLabel?: string
  className?: string
}

export default function ReviewSummary({
  summary,
  onWriteReview,
  writeDisabled = false,
  writeLabel = "Write a Review",
  className,
}: ReviewSummaryProps) {
  const { average, count, breakdown } = summary
  const hasReviews = count > 0

  return (
    <div
      className={cn(
        "rounded-[17px] border border-black/[0.06] bg-white p-4 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {hasReviews ? (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                <ReviewStars rating={average} size="lg" />
                <span className="text-2xl font-semibold tracking-tight tabular-nums text-black">
                  {average.toFixed(1)}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-black/55">
                Based on {count} review{count === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <>
              <ReviewStars rating={0} size="lg" label="No reviews yet" />
              <p className="mt-1.5 text-sm text-black/55">No reviews yet</p>
            </>
          )}

          {onWriteReview ? (
            <button
              type="button"
              onClick={onWriteReview}
              disabled={writeDisabled}
              className={cn(
                "mt-4 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40",
                writeDisabled
                  ? "cursor-not-allowed bg-neutral-100 text-black/40"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
            >
              {writeLabel}
            </button>
          ) : null}
        </div>

        {hasReviews ? (
          <div
            className="min-w-0 flex-1 sm:max-w-sm"
            aria-label="Rating breakdown"
          >
            {([5, 4, 3, 2, 1] as const).map((stars) => {
              const n = breakdown[String(stars) as "1" | "2" | "3" | "4" | "5"]
              const pct = count > 0 ? Math.round((n / count) * 100) : 0
              return (
                <div
                  key={stars}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2 py-1"
                >
                  <ReviewStars
                    rating={stars}
                    size="sm"
                    label={`${stars} stars`}
                  />
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
                    role="presentation"
                  >
                  <div
                    className="h-full rounded-full bg-[#6366F1]"
                    style={{ width: `${pct}%` }}
                  />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-black/50">
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
