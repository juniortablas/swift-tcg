import { WEEKLY_RESTOCK_NOTICE } from "@/lib/product/constants"
import {
  WEEKLY_RESTOCK_URGENCY_THRESHOLD,
  reservedFromRemaining,
  weeklyRestockFractionLabel,
  weeklyRestockRemainingCopy,
} from "@/lib/product/weeklyRestock"
import { cn } from "@/lib/utils"

/**
 * PDP reservation panel — remaining inventory, urgency, and progress.
 * Presentational only.
 */
export default function WeeklyRestockNotice({
  remaining,
  limit,
}: {
  remaining: number
  limit: number
}) {
  const urgent =
    remaining > 0 && remaining <= WEEKLY_RESTOCK_URGENCY_THRESHOLD
  const cap = Math.max(limit, remaining)
  const reserved = reservedFromRemaining(cap, remaining)
  const fillPercent = cap > 0 ? Math.min(100, (reserved / cap) * 100) : 0

  return (
    <aside
      aria-labelledby="weekly-restock-heading"
      className={cn(
        "mt-4 rounded-[14px] border px-3 py-2.5 sm:mt-5 sm:rounded-[17px] sm:px-3.5 sm:py-3",
        urgent
          ? "border-amber-500/20 bg-amber-50"
          : "border-black/[0.06] bg-[#fafafa]"
      )}
    >
      <h2
        id="weekly-restock-heading"
        className="text-[13px] font-semibold tracking-tight text-black sm:text-sm"
      >
        {WEEKLY_RESTOCK_NOTICE.title}
      </h2>
      <p
        className={cn(
          "mt-1 text-xs leading-relaxed sm:text-[13px]",
          urgent ? "text-amber-950/80" : "text-black/70"
        )}
      >
        {WEEKLY_RESTOCK_NOTICE.body}
      </p>

      <div className="mt-2.5">
        <p
          className={cn(
            "text-[11px] font-semibold tracking-[0.08em] uppercase",
            urgent ? "text-amber-900" : "text-black/45"
          )}
        >
          {WEEKLY_RESTOCK_NOTICE.remainingLabel}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm font-semibold tabular-nums sm:text-[15px]",
            urgent ? "text-amber-900" : "text-black"
          )}
        >
          {urgent
            ? weeklyRestockRemainingCopy(remaining, cap)
            : weeklyRestockFractionLabel(remaining, cap)}
        </p>

        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/[0.08]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={cap}
          aria-valuenow={reserved}
          aria-label={`${remaining} of ${cap} reservations remaining`}
        >
          <div
            className={cn(
              "h-full rounded-full",
              urgent ? "bg-amber-600" : "bg-green-600"
            )}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>
    </aside>
  )
}
