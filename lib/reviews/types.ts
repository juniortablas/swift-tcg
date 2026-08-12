import type { ReviewBreakdown, ReviewStatus } from "@/lib/reviews/constants"

export type ReviewSort = "newest" | "highest" | "lowest"

export type ReviewImage = {
  id: string
  url: string
  altText: string | null
  width: number | null
  height: number | null
}

export type ProductReview = {
  id: string
  productId: string
  customerId: string
  orderId: string | null
  rating: number
  title: string | null
  body: string
  images: ReviewImage[]
  verifiedPurchase: boolean
  helpfulCount: number
  status: ReviewStatus
  nickname: string | null
  displayName: string
  reviewedAt: string
  createdAt: string
  updatedAt: string
}

export type ReviewSummary = {
  average: number
  count: number
  breakdown: ReviewBreakdown
}

export type ReviewListResult = {
  reviews: ProductReview[]
  pageInfo: {
    page: number
    pageSize: number
    total: number
    hasNextPage: boolean
  }
  summary: ReviewSummary
  sort: ReviewSort
}

export type ReviewEligibility = {
  loggedIn: boolean
  canReview: boolean
  reason:
    | "ok"
    | "auth_required"
    | "not_purchased"
    | "already_reviewed"
    | "pending_review"
  existingReviewId: string | null
  verifiedPurchase: boolean
  orderId: string | null
}

export type ReviewSubmitInput = {
  productId: string
  rating: number
  body: string
  title?: string | null
  nickname?: string | null
  /** Shopify MediaImage / File GIDs already uploaded. */
  imageIds?: string[]
}

export type ReviewUpdateInput = {
  reviewId: string
  rating?: number
  body?: string
  title?: string | null
  nickname?: string | null
  imageIds?: string[]
}

export type ReviewsApiError = {
  code:
    | "auth_required"
    | "invalid"
    | "not_purchased"
    | "already_reviewed"
    | "forbidden"
    | "not_found"
    | "shopify"
    | "limit"
  message: string
}

export type ReviewsListApiResponse = ReviewListResult & {
  error?: ReviewsApiError
}

export type ReviewsEligibilityApiResponse = ReviewEligibility & {
  error?: ReviewsApiError
}

export type ReviewsMutationApiResponse = {
  review?: ProductReview
  summary?: ReviewSummary
  eligibility?: ReviewEligibility
  helpfulCount?: number
  voted?: boolean
  deleted?: boolean
  error?: ReviewsApiError
}

export type ReviewContextValue = {
  productId: string
  productTitle: string
  productSlug: string
  productUrl: string
  productImage: string | null
  summary: ReviewSummary
  isHydrated: boolean
  loggedIn: boolean
  eligibility: ReviewEligibility | null
  modalOpen: boolean
  openModal: () => void
  closeModal: () => void
  requestWriteReview: () => void
  refreshEligibility: () => Promise<void>
  setSummary: (summary: ReviewSummary) => void
  helpfulVoteIds: Set<string>
  markHelpfulLocal: (reviewId: string) => void
}
