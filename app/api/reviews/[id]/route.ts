import { NextResponse } from "next/server"

import { ShopifyClientError } from "@/lib/shopify/client"
import { getCustomerAccessToken } from "@/lib/shopify/customerAccount"
import {
  deletePendingReview,
  markReviewHelpful,
  ReviewsAuthError,
  ReviewsValidationError,
  updatePendingReview,
} from "@/lib/reviews/server"
import type { ReviewsApiError, ReviewsMutationApiResponse } from "@/lib/reviews/types"

export const dynamic = "force-dynamic"

function errorPayload(error: unknown): {
  status: number
  error: ReviewsApiError
} {
  if (error instanceof ReviewsAuthError) {
    return {
      status: 401,
      error: { code: "auth_required", message: error.message },
    }
  }
  if (error instanceof ReviewsValidationError) {
    const status =
      error.code === "not_found"
        ? 404
        : error.code === "forbidden"
          ? 403
          : 400
    return {
      status,
      error: { code: error.code, message: error.message },
    }
  }
  if (error instanceof ShopifyClientError) {
    const status = error.status === 401 ? 401 : 502
    return {
      status,
      error: {
        code: status === 401 ? "auth_required" : "shopify",
        message: error.message,
      },
    }
  }
  return {
    status: 500,
    error: {
      code: "shopify",
      message:
        error instanceof Error ? error.message : "Unexpected reviews error.",
    },
  }
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const token = await getCustomerAccessToken()
  if (!token) {
    return NextResponse.json(
      {
        error: {
          code: "auth_required",
          message: "Sign in to mark reviews helpful.",
        },
      } satisfies ReviewsMutationApiResponse,
      { status: 401 }
    )
  }

  let body: { action?: string } = {}
  try {
    body = (await request.json()) as { action?: string }
  } catch {
    body = {}
  }

  const action = body.action ?? "helpful"

  try {
    if (action === "helpful") {
      const result = await markReviewHelpful(
        id.startsWith("gid://") ? id : `gid://shopify/Metaobject/${id}`
      )
      return NextResponse.json({
        helpfulCount: result.helpfulCount,
        voted: result.voted,
      } satisfies ReviewsMutationApiResponse)
    }
    return NextResponse.json(
      {
        error: { code: "invalid", message: "Unknown action." },
      } satisfies ReviewsMutationApiResponse,
      { status: 400 }
    )
  } catch (error) {
    const { status, error: apiError } = errorPayload(error)
    return NextResponse.json(
      { error: apiError } satisfies ReviewsMutationApiResponse,
      { status }
    )
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params
  const token = await getCustomerAccessToken()
  if (!token) {
    return NextResponse.json(
      {
        error: {
          code: "auth_required",
          message: "Sign in to edit your review.",
        },
      } satisfies ReviewsMutationApiResponse,
      { status: 401 }
    )
  }

  let body: {
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

  const reviewId = id.startsWith("gid://")
    ? id
    : `gid://shopify/Metaobject/${id}`

  try {
    const review = await updatePendingReview({
      reviewId,
      rating: body.rating,
      title: body.title,
      body: body.body,
      nickname: body.nickname,
      imageIds: body.imageIds,
    })
    return NextResponse.json({ review } satisfies ReviewsMutationApiResponse)
  } catch (error) {
    const { status, error: apiError } = errorPayload(error)
    return NextResponse.json(
      { error: apiError } satisfies ReviewsMutationApiResponse,
      { status }
    )
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const token = await getCustomerAccessToken()
  if (!token) {
    return NextResponse.json(
      {
        error: {
          code: "auth_required",
          message: "Sign in to delete your review.",
        },
      } satisfies ReviewsMutationApiResponse,
      { status: 401 }
    )
  }

  const reviewId = id.startsWith("gid://")
    ? id
    : `gid://shopify/Metaobject/${id}`

  try {
    await deletePendingReview(reviewId)
    return NextResponse.json({ deleted: true } satisfies ReviewsMutationApiResponse)
  } catch (error) {
    const { status, error: apiError } = errorPayload(error)
    return NextResponse.json(
      { error: apiError } satisfies ReviewsMutationApiResponse,
      { status }
    )
  }
}
