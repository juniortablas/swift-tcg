import { NextResponse } from "next/server"

import { ShopifyClientError } from "@/lib/shopify/client"
import { getCustomerAccessToken } from "@/lib/shopify/customerAccount"
import {
  getWishlistSnapshot,
  mutateWishlist,
  WishlistAuthError,
  WishlistValidationError,
} from "@/lib/wishlist/server"
import type { WishlistApiResponse } from "@/lib/wishlist/types"

export const dynamic = "force-dynamic"

function emptyPayload(loggedIn: boolean): WishlistApiResponse {
  return { productIds: [], loggedIn }
}

function errorResponse(
  error: unknown,
  loggedIn: boolean
): NextResponse<WishlistApiResponse> {
  if (error instanceof WishlistAuthError) {
    return NextResponse.json(
      {
        ...emptyPayload(false),
        error: { code: "auth_required", message: error.message },
      },
      { status: 401 }
    )
  }

  if (error instanceof WishlistValidationError) {
    return NextResponse.json(
      {
        ...emptyPayload(loggedIn),
        error: { code: error.code, message: error.message },
      },
      { status: 400 }
    )
  }

  if (error instanceof ShopifyClientError) {
    const status = error.status === 401 ? 401 : 502
    return NextResponse.json(
      {
        ...emptyPayload(loggedIn && status !== 401),
        error: {
          code: status === 401 ? "auth_required" : "shopify",
          message: error.message,
        },
      },
      { status }
    )
  }

  const message =
    error instanceof Error ? error.message : "Unexpected wishlist error."
  return NextResponse.json(
    {
      ...emptyPayload(loggedIn),
      error: { code: "shopify", message },
    },
    { status: 500 }
  )
}

export async function GET() {
  const token = await getCustomerAccessToken()
  if (!token) {
    return NextResponse.json(emptyPayload(false))
  }

  try {
    const snapshot = await getWishlistSnapshot()
    return NextResponse.json({
      productIds: snapshot.productIds,
      loggedIn: true,
    } satisfies WishlistApiResponse)
  } catch (error) {
    return errorResponse(error, true)
  }
}

export async function POST(request: Request) {
  const token = await getCustomerAccessToken()
  if (!token) {
    return NextResponse.json(
      {
        ...emptyPayload(false),
        error: {
          code: "auth_required",
          message: "Sign in to save products to your wishlist.",
        },
      } satisfies WishlistApiResponse,
      { status: 401 }
    )
  }

  let body: { action?: string; productId?: string }
  try {
    body = (await request.json()) as { action?: string; productId?: string }
  } catch {
    return NextResponse.json(
      {
        ...emptyPayload(true),
        error: { code: "invalid", message: "Invalid JSON body." },
      } satisfies WishlistApiResponse,
      { status: 400 }
    )
  }

  const action = body.action
  const productId = typeof body.productId === "string" ? body.productId.trim() : ""

  if (action !== "toggle" && action !== "add" && action !== "remove") {
    return NextResponse.json(
      {
        ...emptyPayload(true),
        error: {
          code: "invalid",
          message: "action must be toggle, add, or remove.",
        },
      } satisfies WishlistApiResponse,
      { status: 400 }
    )
  }

  try {
    const result = await mutateWishlist({ productId, action })
    return NextResponse.json({
      productIds: result.productIds,
      loggedIn: true,
      added: result.added,
      removed: result.removed,
    } satisfies WishlistApiResponse)
  } catch (error) {
    return errorResponse(error, true)
  }
}
