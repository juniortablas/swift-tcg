"use client"

import dynamic from "next/dynamic"

import ReviewList from "@/components/reviews/ReviewList"
import ReviewSummary from "@/components/reviews/ReviewSummary"
import { ReviewProvider } from "@/lib/reviews/ReviewsProvider"
import { useReviews } from "@/lib/reviews/useReviews"
import type { ReviewSummary as ReviewSummaryType } from "@/lib/reviews/types"

const ReviewModal = dynamic(() => import("@/components/reviews/ReviewModal"), {
  ssr: false,
})

type ProductReviewsSectionProps = {
  productId: string
  productTitle: string
  productSlug: string
  productUrl: string
  productImage?: string | null
  initialSummary: ReviewSummaryType
  customerLoggedIn?: boolean
}

function writeButtonLabel(
  eligibility: ReturnType<typeof useReviews>["eligibility"]
): string {
  if (!eligibility) return "Write a Review"
  switch (eligibility.reason) {
    case "auth_required":
      return "Sign in to Review"
    case "not_purchased":
      return "Purchase to Review"
    case "already_reviewed":
      return "Already Reviewed"
    case "pending_review":
      return "Review Pending"
    default:
      return "Write a Review"
  }
}

function ReviewsBody() {
  const {
    productId,
    productTitle,
    summary,
    setSummary,
    loggedIn,
    eligibility,
    modalOpen,
    closeModal,
    requestWriteReview,
    refreshEligibility,
    helpfulVoteIds,
    markHelpfulLocal,
  } = useReviews()

  const writeDisabled = Boolean(
    eligibility &&
      !eligibility.canReview &&
      eligibility.reason !== "auth_required"
  )

  return (
    <section
      id="product-reviews"
      aria-labelledby="product-reviews-heading"
      className="scroll-mt-24"
    >
      <h2
        id="product-reviews-heading"
        className="mb-4 text-lg font-semibold tracking-tight text-black sm:mb-5 sm:text-xl"
      >
        Reviews
      </h2>

      <div className="space-y-5">
        <ReviewSummary
          summary={summary}
          onWriteReview={requestWriteReview}
          writeDisabled={writeDisabled}
          writeLabel={writeButtonLabel(eligibility)}
        />

        <ReviewList
          productId={productId}
          loggedIn={loggedIn}
          helpfulVoteIds={helpfulVoteIds}
          onHelpful={(reviewId) => markHelpfulLocal(reviewId)}
          onSummary={setSummary}
        />
      </div>

      {modalOpen ? (
        <ReviewModal
          open={modalOpen}
          onClose={closeModal}
          productId={productId}
          productTitle={productTitle}
          onSubmitted={() => {
            void refreshEligibility()
          }}
        />
      ) : null}
    </section>
  )
}

export default function ProductReviewsSection({
  productId,
  productTitle,
  productSlug,
  productUrl,
  productImage,
  initialSummary,
  customerLoggedIn = false,
}: ProductReviewsSectionProps) {
  return (
    <ReviewProvider
      productId={productId}
      productTitle={productTitle}
      productSlug={productSlug}
      productUrl={productUrl}
      productImage={productImage}
      initialSummary={initialSummary}
      customerLoggedIn={customerLoggedIn}
    >
      <ReviewsBody />
    </ReviewProvider>
  )
}
