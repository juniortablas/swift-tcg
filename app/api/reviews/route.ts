import { NextResponse } from "next/server"

import { ShopifyClientError } from "@/lib/shopify/client"
import { getCustomerAccessToken } from "@/lib/shopify/customerAccount"
import {
  getReviewEligibility,
  listProductReviews,
  ReviewsAuthError,
  ReviewsValidationError,
  submitReview,
  uploadReviewPhoto,
} from "@/lib/reviews/server"
import type {
  ReviewSort,
  ReviewsApiError,
  ReviewsEligibilityApiResponse,
  ReviewsListApiResponse,
  ReviewsMutationApiResponse,
} from "@/lib/reviews/types"
import { emptyBreakdown, isProductGid } from "@/lib/reviews/constants"
import { captureRouteException } from "@/lib/observability/capture"

export const dynamic = "force-dynamic"

function errorPayload(error: unknown): {
  status: number
  error: ReviewsApiError
} {
  let status = 500
  let apiError: ReviewsApiError = {
    code: "shopify",
    message:
      error instanceof Error ? error.message : "Unexpected reviews error.",
  }

  if (error instanceof ReviewsAuthError) {
    status = 401
    apiError = { code: "auth_required", message: error.message }
  } else if (error instanceof ReviewsValidationError) {
    status =
      error.code === "not_found"
        ? 404
        : error.code === "forbidden"
          ? 403
          : 400
    apiError = { code: error.code, message: error.message }
  } else if (error instanceof ShopifyClientError) {
    status = error.status === 401 ? 401 : 502
    apiError = {
      code: status === 401 ? "auth_required" : "shopify",
      message: error.message,
    }
  }

  captureRouteException(error, { route: "/api/reviews", status })
  return { status, error: apiError }
}

function parseSort(value: string | null): ReviewSort {
  if (value === "highest" || value === "lowest" || value === "newest") {
    return value
  }
  return "newest"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("productId")?.trim() ?? ""
  const view = searchParams.get("view")

  if (!isProductGid(productId)) {
    return NextResponse.json(
      {
        reviews: [],
        summary: { average: 0, count: 0, breakdown: emptyBreakdown() },
        sort: "newest" as const,
        pageInfo: { page: 1, pageSize: 5, total: 0, hasNextPage: false },
        error: {
          code: "invalid",
          message: "productId is required.",
        },
      } satisfies ReviewsListApiResponse,
      { status: 400 }
    )
  }

  if (view === "eligibility") {
    try {
      const eligibility = await getReviewEligibility(productId)
      return NextResponse.json({
        ...eligibility,
      } satisfies ReviewsEligibilityApiResponse)
    } catch (error) {
      const { status, error: apiError } = errorPayload(error)
      return NextResponse.json(
        {
          loggedIn: false,
          canReview: false,
          reason: "auth_required",
          existingReviewId: null,
          verifiedPurchase: false,
          orderId: null,
          error: apiError,
        } satisfies ReviewsEligibilityApiResponse,
        { status }
      )
    }
  }

  try {
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10) || 1
    const pageSize =
      Number.parseInt(searchParams.get("pageSize") ?? "5", 10) || 5
    const sort = parseSort(searchParams.get("sort"))
    const result = await listProductReviews({
      productId,
      page,
      pageSize,
      sort,
    })
    return NextResponse.json(result satisfies ReviewsListApiResponse)
  } catch (error) {
    const { status, error: apiError } = errorPayload(error)
    return NextResponse.json(
      {
        reviews: [],
        summary: { average: 0, count: 0, breakdown: emptyBreakdown() },
        sort: "newest" as const,
        pageInfo: { page: 1, pageSize: 5, total: 0, hasNextPage: false },
        error: apiError,
      } satisfies ReviewsListApiResponse,
      { status }
    )
  }
}

export async function POST(request: Request) {
  const token = await getCustomerAccessToken()
  if (!token) {
    return NextResponse.json(
      {
        error: {
          code: "auth_required",
          message: "Sign in to leave a review.",
        },
      } satisfies ReviewsMutationApiResponse,
      { status: 401 }
    )
  }

  const contentType = request.headers.get("content-type") ?? ""

  // Multipart photo upload
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await request.formData()
      const file = form.get("file")
      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            error: { code: "invalid", message: "file is required." },
          } satisfies ReviewsMutationApiResponse,
          { status: 400 }
        )
      }
      const imageId = await uploadReviewPhoto(file)
      return NextResponse.json({ imageId } as ReviewsMutationApiResponse & {
        imageId: string
      })
    } catch (error) {
      const { status, error: apiError } = errorPayload(error)
      return NextResponse.json(
        { error: apiError } satisfies ReviewsMutationApiResponse,
        { status }
      )
    }
  }

  let body: {
    action?: string
    productId?: string
    rating?: number
    title?: string | null
    body?: string
    nickname?: string | null
    imageIds?: string[]
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json(
      {
        error: { code: "invalid", message: "Invalid JSON body." },
      } satisfies ReviewsMutationApiResponse,
      { status: 400 }
    )
  }

  if (body.action && body.action !== "submit") {
    return NextResponse.json(
      {
        error: { code: "invalid", message: "Unknown action." },
      } satisfies ReviewsMutationApiResponse,
      { status: 400 }
    )
  }

  try {
    const result = await submitReview({
      productId: body.productId ?? "",
      rating: body.rating ?? 0,
      body: body.body ?? "",
      title: body.title,
      nickname: body.nickname,
      imageIds: body.imageIds,
    })
    return NextResponse.json({
      review: result.review,
      eligibility: result.eligibility,
    } satisfies ReviewsMutationApiResponse)
  } catch (error) {
    const { status, error: apiError } = errorPayload(error)
    return NextResponse.json(
      { error: apiError } satisfies ReviewsMutationApiResponse,
      { status }
    )
  }
}
