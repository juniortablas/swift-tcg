import { NextResponse } from "next/server"

import {
  getBackInStockSnapshot,
  mutateBackInStock,
  BisAuthError,
  BisValidationError,
} from "@/lib/back-in-stock/server"
import type { BisApiResponse } from "@/lib/back-in-stock/types"
import { customerSubscriptionProductIds } from "@/lib/back-in-stock/constants"
import { ShopifyClientError } from "@/lib/shopify/client"
import { getCustomerAccessToken } from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

function emptyPayload(loggedIn: boolean): BisApiResponse {
  return { subscriptions: [], productIds: [], loggedIn }
}

function errorResponse(
  error: unknown,
  loggedIn: boolean
): NextResponse<BisApiResponse> {
  if (error instanceof BisAuthError) {
    return NextResponse.json(
      {
        ...emptyPayload(false),
        error: { code: "auth_required", message: error.message },
      },
      { status: 401 }
    )
  }

  if (error instanceof BisValidationError) {
    return NextResponse.json(
      {
        ...emptyPayload(loggedIn),
        error: { code: error.code, message: error.message },
      },
      { status: 400 }
    )
  }

  if (error instanceof ShopifyClientError) {
    const status = error.status === 401 ? 401 : error.status === 409 ? 409 : 502
    return NextResponse.json(
      {
        ...emptyPayload(loggedIn && status !== 401),
        error: {
          code: status === 401 ? "auth_required" : "shopify",
          message: error.message,
        },
      },
      { status: status === 409 ? 409 : status }
    )
  }

  const message =
    error instanceof Error ? error.message : "Unexpected back-in-stock error."
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
    const snapshot = await getBackInStockSnapshot()
    return NextResponse.json({
      subscriptions: snapshot.subscriptions,
      productIds: customerSubscriptionProductIds(snapshot.subscriptions),
      loggedIn: true,
    } satisfies BisApiResponse)
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
          message: "Sign in to get back-in-stock alerts.",
        },
      } satisfies BisApiResponse,
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
      } satisfies BisApiResponse,
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
      } satisfies BisApiResponse,
      { status: 400 }
    )
  }

  try {
    const result = await mutateBackInStock({ productId, action })
    return NextResponse.json({
      subscriptions: result.subscriptions,
      productIds: result.productIds,
      loggedIn: true,
      added: result.added,
      removed: result.removed,
    } satisfies BisApiResponse)
  } catch (error) {
    return errorResponse(error, true)
  }
}
