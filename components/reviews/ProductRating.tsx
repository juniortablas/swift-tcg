import ReviewStars from "@/components/reviews/ReviewStars"
import { cn } from "@/lib/utils"

type ProductRatingProps = {
  average: number | null | undefined
  count: number | null | undefined
  size?: "sm" | "md"
  className?: string
  /** Link to reviews section on PDP when provided. */
  href?: string
}

/**
 * Compact rating row for product cards and purchase panel.
 * Shows "No reviews yet" when count is 0 / missing.
 */
export default function ProductRating({
  average,
  count,
  size = "sm",
  className,
  href,
}: ProductRatingProps) {
  const reviewCount = typeof count === "number" && count > 0 ? count : 0
  const rating =
    typeof average === "number" && average > 0 && reviewCount > 0 ? average : 0

  const content =
    reviewCount > 0 ? (
      <span className="inline-flex items-center gap-1.5">
        <ReviewStars rating={rating} size={size} />
        <span
          className={cn(
            "font-medium tabular-nums text-black/70",
            size === "sm" ? "text-[11px]" : "text-sm"
          )}
        >
          {rating.toFixed(1)}
          <span className="text-black/40"> ({reviewCount})</span>
        </span>
      </span>
    ) : (
      <span
        className={cn(
          "font-medium text-black/40",
          size === "sm" ? "text-[11px]" : "text-sm"
        )}
      >
        No reviews yet
      </span>
    )

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          "inline-flex transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40",
          className
        )}
      >
        {content}
      </a>
    )
  }

  return <div className={cn("inline-flex", className)}>{content}</div>
}
