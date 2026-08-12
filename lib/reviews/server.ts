/**
 * Server-side product review orchestration.
 * Shopify metaobjects are the source of truth; aggregates live on products.
 */

import {
  REVIEW_ALLOWED_IMAGE_TYPES,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_FIELD,
  REVIEW_MAX_IMAGES,
  REVIEW_MAX_IMAGE_BYTES,
  REVIEW_NICKNAME_MAX,
  REVIEW_PAGE_SIZE,
  REVIEW_STATUS,
  REVIEW_TITLE_MAX,
  clampRating,
  emptyBreakdown,
  isMetaobjectGid,
  isProductGid,
} from "@/lib/reviews/constants"
import type {
  ReviewEligibility,
  ReviewListResult,
  ReviewSort,
  ReviewSubmitInput,
  ReviewSummary,
  ReviewUpdateInput,
  ProductReview,
} from "@/lib/reviews/types"
import { ShopifyClientError } from "@/lib/shopify/client"
import { getCustomerAccessToken } from "@/lib/shopify/customerAccount/client"
import { getAuthenticatedCustomerId } from "@/lib/shopify/customerAccount/wishlist"
import {
  createReviewMetaobject,
  deleteReviewMetaobject,
  findCustomerProductReview,
  findCustomerPurchase,
  getAdminReviewById,
  getCustomerHelpfulVotes,
  getProductReviewSummaryFromMetafields,
  listApprovedReviewsForProduct,
  listCustomerReviews,
  setCustomerHelpfulVotes,
  setReviewHelpfulCount,
  sortReviews,
  summaryFromReviews,
  syncProductReviewAggregates,
  updateReviewMetaobject,
  uploadReviewImage,
} from "@/lib/shopify/reviewsAdmin"
export class ReviewsAuthError extends Error {
  readonly code = "auth_required" as const
  constructor(message = "Sign in to leave a review.") {
    super(message)
    this.name = "ReviewsAuthError"
  }
}

export class ReviewsValidationError extends Error {
  readonly code:
    | "invalid"
    | "not_purchased"
    | "already_reviewed"
    | "forbidden"
    | "not_found"
    | "limit"
  constructor(
    code:
      | "invalid"
      | "not_purchased"
      | "already_reviewed"
      | "forbidden"
      | "not_found"
      | "limit",
    message: string
  ) {
    super(message)
    this.name = "ReviewsValidationError"
    this.code = code
  }
}

async function requireCustomerId(): Promise<string> {
  const token = await getCustomerAccessToken()
  if (!token) throw new ReviewsAuthError()
  return getAuthenticatedCustomerId()
}

function sanitizeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().replace(/\s+/g, " ")
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function validateBody(body: unknown): string {
  if (typeof body !== "string") {
    throw new ReviewsValidationError("invalid", "Review text is required.")
  }
  const trimmed = body.trim()
  if (trimmed.length < REVIEW_BODY_MIN) {
    throw new ReviewsValidationError(
      "invalid",
      `Review text must be at least ${REVIEW_BODY_MIN} characters.`
    )
  }
  if (trimmed.length > REVIEW_BODY_MAX) {
    throw new ReviewsValidationError(
      "invalid",
      `Review text must be under ${REVIEW_BODY_MAX} characters.`
    )
  }
  return trimmed
}

export async function getReviewSummary(
  productId: string
): Promise<ReviewSummary> {
  if (!isProductGid(productId)) {
    return { average: 0, count: 0, breakdown: emptyBreakdown() }
  }
  try {
    return await getProductReviewSummaryFromMetafields(productId)
  } catch {
    const approved = await listApprovedReviewsForProduct(productId)
    return summaryFromReviews(approved)
  }
}

export async function listProductReviews(input: {
  productId: string
  page?: number
  pageSize?: number
  sort?: ReviewSort
}): Promise<ReviewListResult> {
  if (!isProductGid(input.productId)) {
    throw new ReviewsValidationError("invalid", "A valid product id is required.")
  }

  const sort: ReviewSort = input.sort ?? "newest"
  const pageSize = Math.min(
    Math.max(input.pageSize ?? REVIEW_PAGE_SIZE, 1),
    20
  )
  const page = Math.max(input.page ?? 1, 1)

  const [approved, summary] = await Promise.all([
    listApprovedReviewsForProduct(input.productId),
    getReviewSummary(input.productId),
  ])

  const sorted = sortReviews(approved, sort)
  const start = (page - 1) * pageSize
  const reviews = sorted.slice(start, start + pageSize)

  return {
    reviews,
    summary:
      summary.count > 0
        ? summary
        : summaryFromReviews(approved),
    sort,
    pageInfo: {
      page,
      pageSize,
      total: sorted.length,
      hasNextPage: start + pageSize < sorted.length,
    },
  }
}

export async function getReviewEligibility(
  productId: string
): Promise<ReviewEligibility> {
  if (!isProductGid(productId)) {
    throw new ReviewsValidationError("invalid", "A valid product id is required.")
  }

  const token = await getCustomerAccessToken()
  if (!token) {
    return {
      loggedIn: false,
      canReview: false,
      reason: "auth_required",
      existingReviewId: null,
      verifiedPurchase: false,
      orderId: null,
    }
  }

  const customerId = await getAuthenticatedCustomerId()
  const [existing, purchase] = await Promise.all([
    findCustomerProductReview({ customerId, productId }),
    findCustomerPurchase({ customerId, productId }),
  ])

  if (existing?.status === REVIEW_STATUS.pending) {
    return {
      loggedIn: true,
      canReview: false,
      reason: "pending_review",
      existingReviewId: existing.id,
      verifiedPurchase: existing.verifiedPurchase,
      orderId: existing.orderId,
    }
  }

  if (existing?.status === REVIEW_STATUS.approved) {
    return {
      loggedIn: true,
      canReview: false,
      reason: "already_reviewed",
      existingReviewId: existing.id,
      verifiedPurchase: existing.verifiedPurchase,
      orderId: existing.orderId,
    }
  }

  if (!purchase) {
    return {
      loggedIn: true,
      canReview: false,
      reason: "not_purchased",
      existingReviewId: null,
      verifiedPurchase: false,
      orderId: null,
    }
  }

  return {
    loggedIn: true,
    canReview: true,
    reason: "ok",
    existingReviewId: null,
    verifiedPurchase: true,
    orderId: purchase.orderId,
  }
}

export async function submitReview(
  input: ReviewSubmitInput
): Promise<{ review: ProductReview; eligibility: ReviewEligibility }> {
  const customerId = await requireCustomerId()

  if (!isProductGid(input.productId)) {
    throw new ReviewsValidationError("invalid", "A valid product id is required.")
  }

  const rating = clampRating(input.rating)
  if (rating == null) {
    throw new ReviewsValidationError("invalid", "Rating must be between 1 and 5.")
  }

  const body = validateBody(input.body)
  const title = sanitizeText(input.title, REVIEW_TITLE_MAX)
  const nickname = sanitizeText(input.nickname, REVIEW_NICKNAME_MAX)
  const imageIds = (input.imageIds ?? []).filter((id) =>
    typeof id === "string" && id.startsWith("gid://shopify/")
  )
  if (imageIds.length > REVIEW_MAX_IMAGES) {
    throw new ReviewsValidationError(
      "limit",
      `Up to ${REVIEW_MAX_IMAGES} photos are allowed.`
    )
  }

  const eligibility = await getReviewEligibility(input.productId)
  if (!eligibility.canReview) {
    if (eligibility.reason === "auth_required") throw new ReviewsAuthError()
    if (eligibility.reason === "not_purchased") {
      throw new ReviewsValidationError(
        "not_purchased",
        "Only customers who purchased this product can leave a review."
      )
    }
    if (
      eligibility.reason === "already_reviewed" ||
      eligibility.reason === "pending_review"
    ) {
      throw new ReviewsValidationError(
        "already_reviewed",
        eligibility.reason === "pending_review"
          ? "You already have a review pending moderation."
          : "You already reviewed this product."
      )
    }
  }

  const review = await createReviewMetaobject({
    productId: input.productId,
    customerId,
    orderId: eligibility.orderId,
    rating,
    title,
    body,
    imageIds,
    verifiedPurchase: eligibility.verifiedPurchase,
    nickname,
    status: REVIEW_STATUS.pending,
  })

  return {
    review,
    eligibility: await getReviewEligibility(input.productId),
  }
}

export async function updatePendingReview(
  input: ReviewUpdateInput
): Promise<ProductReview> {
  const customerId = await requireCustomerId()
  if (!isMetaobjectGid(input.reviewId)) {
    throw new ReviewsValidationError("invalid", "A valid review id is required.")
  }

  const existing = await getAdminReviewById(input.reviewId)
  if (!existing) {
    throw new ReviewsValidationError("not_found", "Review not found.")
  }
  if (existing.customerId !== customerId) {
    throw new ReviewsValidationError(
      "forbidden",
      "You can only edit your own reviews."
    )
  }
  if (existing.status !== REVIEW_STATUS.pending) {
    throw new ReviewsValidationError(
      "forbidden",
      "Only pending reviews can be edited."
    )
  }

  const fields: Array<{ key: string; value: string }> = []

  if (input.rating !== undefined) {
    const rating = clampRating(input.rating)
    if (rating == null) {
      throw new ReviewsValidationError(
        "invalid",
        "Rating must be between 1 and 5."
      )
    }
    fields.push({ key: REVIEW_FIELD.rating, value: String(rating) })
  }

  if (input.body !== undefined) {
    fields.push({ key: REVIEW_FIELD.body, value: validateBody(input.body) })
  }

  if (input.title !== undefined) {
    fields.push({
      key: REVIEW_FIELD.title,
      value: sanitizeText(input.title, REVIEW_TITLE_MAX) ?? "",
    })
  }

  if (input.nickname !== undefined) {
    fields.push({
      key: REVIEW_FIELD.nickname,
      value: sanitizeText(input.nickname, REVIEW_NICKNAME_MAX) ?? "",
    })
  }

  if (input.imageIds !== undefined) {
    const imageIds = input.imageIds.filter((id) =>
      typeof id === "string" && id.startsWith("gid://shopify/")
    )
    if (imageIds.length > REVIEW_MAX_IMAGES) {
      throw new ReviewsValidationError(
        "limit",
        `Up to ${REVIEW_MAX_IMAGES} photos are allowed.`
      )
    }
    fields.push({
      key: REVIEW_FIELD.images,
      value: JSON.stringify(imageIds),
    })
  }

  if (fields.length === 0) return existing
  return updateReviewMetaobject({ id: input.reviewId, fields })
}

export async function deletePendingReview(reviewId: string): Promise<void> {
  const customerId = await requireCustomerId()
  if (!isMetaobjectGid(reviewId)) {
    throw new ReviewsValidationError("invalid", "A valid review id is required.")
  }

  const existing = await getAdminReviewById(reviewId)
  if (!existing) {
    throw new ReviewsValidationError("not_found", "Review not found.")
  }
  if (existing.customerId !== customerId) {
    throw new ReviewsValidationError(
      "forbidden",
      "You can only delete your own reviews."
    )
  }
  if (existing.status !== REVIEW_STATUS.pending) {
    throw new ReviewsValidationError(
      "forbidden",
      "Only pending reviews can be deleted."
    )
  }

  await deleteReviewMetaobject(reviewId)
}

export async function markReviewHelpful(reviewId: string): Promise<{
  helpfulCount: number
  voted: boolean
}> {
  const customerId = await requireCustomerId()
  if (!isMetaobjectGid(reviewId)) {
    throw new ReviewsValidationError("invalid", "A valid review id is required.")
  }

  const review = await getAdminReviewById(reviewId)
  if (!review || review.status !== REVIEW_STATUS.approved) {
    throw new ReviewsValidationError("not_found", "Review not found.")
  }

  const votes = await getCustomerHelpfulVotes(customerId)
  if (votes.reviewIds.includes(reviewId)) {
    return { helpfulCount: review.helpfulCount, voted: false }
  }

  const nextIds = [...votes.reviewIds, reviewId]
  await setCustomerHelpfulVotes({
    customerId,
    reviewIds: nextIds,
    compareDigest: votes.compareDigest,
  })

  const updated = await setReviewHelpfulCount({
    id: reviewId,
    helpfulCount: review.helpfulCount + 1,
  })

  return { helpfulCount: updated.helpfulCount, voted: true }
}

export async function getCustomerHelpfulVoteSet(): Promise<Set<string>> {
  const token = await getCustomerAccessToken()
  if (!token) return new Set()
  try {
    const customerId = await getAuthenticatedCustomerId()
    const votes = await getCustomerHelpfulVotes(customerId)
    return new Set(votes.reviewIds)
  } catch {
    return new Set()
  }
}

export async function getMyReviews(): Promise<ProductReview[]> {
  const customerId = await requireCustomerId()
  return listCustomerReviews(customerId)
}

export async function uploadReviewPhoto(file: File): Promise<string> {
  await requireCustomerId()

  if (
    !REVIEW_ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof REVIEW_ALLOWED_IMAGE_TYPES)[number]
    )
  ) {
    throw new ReviewsValidationError(
      "invalid",
      "Photos must be JPEG, PNG, WebP, or GIF."
    )
  }
  if (file.size > REVIEW_MAX_IMAGE_BYTES) {
    throw new ReviewsValidationError(
      "limit",
      "Each photo must be 5MB or smaller."
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "review.jpg"

  try {
    return await uploadReviewImage({
      filename: safeName,
      mimeType: file.type,
      buffer,
      alt: "Customer review photo",
    })
  } catch (error) {
    if (error instanceof ShopifyClientError) throw error
    throw new ShopifyClientError(
      error instanceof Error ? error.message : "Image upload failed.",
      502
    )
  }
}

export { syncProductReviewAggregates }
