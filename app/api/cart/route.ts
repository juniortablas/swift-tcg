import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import * as Sentry from "@sentry/nextjs"

import { MIXED_CART_MESSAGE } from "@/lib/cart/mixedCart"
import type { CartItemKind } from "@/lib/cart/types"
import {
  addProductToShopifyCart,
  clearShopifyCart,
  emptyCartPayload,
  fetchShopifyCart,
  prepareShopifyCheckout,
  removeShopifyCartLines,
  updateCartLineQuantities,
  type CartOperationError,
  type CartPayload,
} from "@/lib/shopify/cart"
import { ShopifyClientError } from "@/lib/shopify/client"
import { attachCustomerToCart } from "@/lib/shopify/customerAccount"
import { isShopifyThrottledError } from "@/lib/shopify/throttle"
import { captureRouteException } from "@/lib/observability/capture"
import {
  parseReservationSessionCookie,
  reservationCookieOptions,
  RESERVATION_SESSION_COOKIE,
  serializeReservationSessionCookie,
  sessionFromCartPayload,
} from "@/lib/shopify/weeklyRestockCartCache"

export const dynamic = "force-dynamic"

function buyerIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return request.headers.get("x-real-ip")?.trim() || undefined
}

function isMissingCartError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const status =
    error instanceof ShopifyClientError ? error.status : undefined
  if (status === 404) return true
  const message = error.message.toLowerCase()
  return (
    message.includes("cart") &&
    (message.includes("does not exist") ||
      message.includes("not found") ||
      message.includes("invalid"))
  )
}

function isCartOperationError(
  error: unknown
): error is Error & CartOperationError {
  if (!(error instanceof Error)) return false
  const code = (error as unknown as CartOperationError).code
  const message = (error as unknown as CartOperationError).message
  return typeof code === "string" && typeof message === "string"
}

function errorResponse(error: unknown) {
  if (isCartOperationError(error)) {
    const status =
      error.code === "not_found"
        ? 404
        : error.code === "mixed_cart" ||
            error.code === "sold_out" ||
            error.code === "inventory" ||
            error.code === "invalid"
          ? 409
          : 400

    return NextResponse.json(
      {
        error: {
          code: error.code,
          message:
            error.code === "mixed_cart" ? MIXED_CART_MESSAGE : error.message,
        },
        ...emptyCartPayload(),
      },
      { status }
    )
  }

  if (isShopifyThrottledError(error)) {
    Sentry.captureException(error, {
      tags: { route: "/api/cart", shopify: "throttled" },
    })
    return NextResponse.json(
      {
        error: {
          code: "throttled",
          message: "Too many requests. Please try again in a moment.",
        },
        ...emptyCartPayload(),
      },
      { status: 429 }
    )
  }

  if (error instanceof ShopifyClientError) {
    captureRouteException(error, { route: "/api/cart", status: 502 })
    return NextResponse.json(
      {
        error: { code: "shopify", message: error.message },
        ...emptyCartPayload(),
      },
      { status: 502 }
    )
  }

  const message =
    error instanceof Error ? error.message : "Unexpected cart error."
  captureRouteException(error, { route: "/api/cart", status: 500 })
  return NextResponse.json(
    {
      error: { code: "shopify", message },
      ...emptyCartPayload(),
    },
    { status: 500 }
  )
}

async function reservationSessionFromRequest() {
  const jar = await cookies()
  return parseReservationSessionCookie(
    jar.get(RESERVATION_SESSION_COOKIE)?.value
  )
}

function withReservationCookie(
  response: NextResponse,
  payload: CartPayload,
  request: Request
): NextResponse {
  const session = sessionFromCartPayload(payload)
  const secure = new URL(request.url).protocol === "https:"
  if (!session) {
    response.cookies.set(RESERVATION_SESSION_COOKIE, "", {
      ...reservationCookieOptions(),
      maxAge: 0,
      secure,
    })
    return response
  }
  response.cookies.set(
    RESERVATION_SESSION_COOKIE,
    serializeReservationSessionCookie(session),
    { ...reservationCookieOptions(), secure }
  )
  return response
}

function ok(payload: CartPayload, request: Request) {
  return withReservationCookie(NextResponse.json(payload), payload, request)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cartId = searchParams.get("cartId")?.trim() ?? ""

  if (!cartId) {
    return ok(emptyCartPayload(), request)
  }

  try {
    const payload = await fetchShopifyCart(cartId, {
      buyerIp: buyerIpFromRequest(request),
    })
    return ok(payload, request)
  } catch (error) {
    // Expired / missing carts come back as `cart: null` (empty 200).
    // Only treat explicit "does not exist" GraphQL errors as empty —
    // a 502 from Shopify must not wipe the shopper's stored cart id.
    if (isMissingCartError(error)) {
      return ok(emptyCartPayload(), request)
    }
    return errorResponse(error)
  }
}

type CartLineQuantityUpdate = {
  lineId: string
  quantity: number
}

type CartActionBody = {
  action: "add" | "update" | "remove" | "clear" | "attachCustomer" | "prepareCheckout"
  cartId?: string | null
  productId?: string
  lineId?: string
  quantity?: number
  lines?: CartLineQuantityUpdate[]
  status?: CartItemKind
  skipMixedCheck?: boolean
}

function quantityUpdatesFromBody(
  body: CartActionBody
): CartLineQuantityUpdate[] {
  if (Array.isArray(body.lines) && body.lines.length > 0) {
    return body.lines
      .filter((line) => typeof line?.lineId === "string" && line.lineId.trim())
      .map((line) => ({
        lineId: line.lineId.trim(),
        quantity: line.quantity ?? 0,
      }))
  }
  if (body.lineId?.trim()) {
    return [{ lineId: body.lineId.trim(), quantity: body.quantity ?? 0 }]
  }
  return []
}

export async function POST(request: Request) {
  let body: CartActionBody
  try {
    body = (await request.json()) as CartActionBody
  } catch {
    return NextResponse.json(
      {
        error: { code: "invalid", message: "Invalid JSON body." },
        ...emptyCartPayload(),
      },
      { status: 400 }
    )
  }

  const buyerIp = buyerIpFromRequest(request)
  const cartId = body.cartId?.trim() || null
  const reservationSession = await reservationSessionFromRequest()

  try {
    switch (body.action) {
      case "add": {
        if (!body.productId?.trim()) {
          return NextResponse.json(
            {
              error: { code: "invalid", message: "productId is required." },
              ...emptyCartPayload(),
            },
            { status: 400 }
          )
        }
        if (body.status !== "preorder" && body.status !== "instock") {
          return NextResponse.json(
            {
              error: {
                code: "sold_out",
                message: "This product cannot be added to the cart.",
              },
              ...emptyCartPayload(),
            },
            { status: 409 }
          )
        }

        const payload = await addProductToShopifyCart(
          {
            cartId,
            productId: body.productId.trim(),
            quantity: body.quantity,
            status: body.status,
            skipMixedCheck: body.skipMixedCheck === true,
          },
          { buyerIp, reservationSession }
        )
        return ok(payload, request)
      }

      case "update": {
        const lines = quantityUpdatesFromBody(body)
        if (!cartId || lines.length === 0) {
          return NextResponse.json(
            {
              error: {
                code: "invalid",
                message: "cartId and lineId are required.",
              },
              ...emptyCartPayload(),
            },
            { status: 400 }
          )
        }
        const payload = await updateCartLineQuantities(cartId, lines, {
          buyerIp,
          reservationSession,
        })
        return ok(payload, request)
      }

      case "remove": {
        if (!cartId || !body.lineId?.trim()) {
          return NextResponse.json(
            {
              error: {
                code: "invalid",
                message: "cartId and lineId are required.",
              },
              ...emptyCartPayload(),
            },
            { status: 400 }
          )
        }
        const payload = await removeShopifyCartLines(
          cartId,
          [body.lineId.trim()],
          { buyerIp, reservationSession }
        )
        return ok(payload, request)
      }

      case "clear": {
        if (!cartId) {
          return ok(emptyCartPayload(), request)
        }
        const payload = await clearShopifyCart(cartId, {
          buyerIp,
          reservationSession,
        })
        return ok(payload, request)
      }

      case "attachCustomer": {
        if (!cartId) {
          return ok(emptyCartPayload(), request)
        }
        const attached = await attachCustomerToCart(cartId, {
          buyerIp,
          reservationSession,
        })
        if (attached) return ok(attached, request)
        const payload = await fetchShopifyCart(cartId, { buyerIp })
        return ok(payload, request)
      }

      case "prepareCheckout": {
        if (!cartId) {
          return NextResponse.json(
            {
              error: { code: "invalid", message: "cartId is required." },
              ...emptyCartPayload(),
            },
            { status: 400 }
          )
        }
        const payload = await prepareShopifyCheckout(cartId, { buyerIp })
        return ok(payload, request)
      }

      default:
        return NextResponse.json(
          {
            error: { code: "invalid", message: "Unknown cart action." },
            ...emptyCartPayload(),
          },
          { status: 400 }
        )
    }
  } catch (error) {
    return errorResponse(error)
  }
}
