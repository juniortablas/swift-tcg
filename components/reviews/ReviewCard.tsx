import { Check } from "lucide-react"

import HelpfulButton from "@/components/reviews/HelpfulButton"
import ReviewGallery from "@/components/reviews/ReviewGallery"
import ReviewStars from "@/components/reviews/ReviewStars"
import type { ProductReview } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"

function formatReviewDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

type ReviewCardProps = {
  review: ProductReview
  loggedIn?: boolean
  alreadyVoted?: boolean
  onHelpful?: (reviewId: string, helpfulCount: number) => void
  className?: string
}

export default function ReviewCard({
  review,
  loggedIn = false,
  alreadyVoted = false,
  onHelpful,
  className,
}: ReviewCardProps) {
  return (
    <article
      className={cn(
        "rounded-[17px] border border-black/[0.06] bg-white p-4 sm:p-5",
        className
      )}
      aria-label={`Review by ${review.displayName}, ${review.rating} out of 5`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ReviewStars rating={review.rating} size="sm" />
        {review.verifiedPurchase ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-green-700 uppercase">
            <Check className="size-3.5" aria-hidden="true" />
            Verified Purchase
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-sm font-semibold text-black">{review.displayName}</p>
        <time
          dateTime={review.reviewedAt}
          className="text-xs text-black/45"
        >
          {formatReviewDate(review.reviewedAt)}
        </time>
      </div>

      {review.title ? (
        <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-black">
          {review.title}
        </h3>
      ) : null}

      <p className="mt-1.5 text-sm leading-relaxed text-black/75 whitespace-pre-wrap">
        {review.body}
      </p>

      <ReviewGallery images={review.images} />

      <div className="mt-4">
        <HelpfulButton
          reviewId={review.id}
          helpfulCount={review.helpfulCount}
          alreadyVoted={alreadyVoted}
          loggedIn={loggedIn}
          onVoted={(count) => onHelpful?.(review.id, count)}
        />
      </div>
    </article>
  )
}
