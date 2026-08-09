import { NextResponse } from "next/server"

import { MIXED_CART_MESSAGE } from "@/lib/cart/mixedCart"
import type { CartItemKind } from "@/lib/cart/types"
import {
  addProductToShopifyCart,
  clearShopifyCart,
  emptyCartPayload,
  fetchShopifyCart,
  removeShopifyCartLines,
  updateCartLineQuantity,
  type CartOperationError,
  type CartPayload,
} from "@/lib/shopify/cart"
import { ShopifyClientError } from "@/lib/shopify/client"
import { attachCustomerToCart } from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

function buyerIpFromRequest(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return request.headers.get("x-real-ip")?.trim() || undefined
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

  if (error instanceof ShopifyClientError) {
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
  return NextResponse.json(
    {
      error: { code: "shopify", message },
      ...emptyCartPayload(),
    },
    { status: 500 }
  )
}

function ok(payload: CartPayload) {
  return NextResponse.json(payload)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cartId = searchParams.get("cartId")?.trim() ?? ""

  if (!cartId) {
    return ok(emptyCartPayload())
  }

  try {
    const payload = await fetchShopifyCart(cartId, {
      buyerIp: buyerIpFromRequest(request),
    })
    return ok(payload)
  } catch (error) {
    // Expired / invalid cart id → treat as empty so the client can start fresh.
    if (
      error instanceof ShopifyClientError ||
      (error instanceof Error && /cart/i.test(error.message))
    ) {
      return ok(emptyCartPayload())
    }
    return errorResponse(error)
  }
}

type CartActionBody = {
  action: "add" | "update" | "remove" | "clear" | "attachCustomer"
  cartId?: string | null
  productId?: string
  lineId?: string
  quantity?: number
  status?: CartItemKind
  skipMixedCheck?: boolean
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
          { buyerIp }
        )
        return ok(payload)
      }

      case "update": {
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
        const payload = await updateCartLineQuantity(
          cartId,
          body.lineId.trim(),
          body.quantity ?? 0,
          { buyerIp }
        )
        return ok(payload)
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
          { buyerIp }
        )
        return ok(payload)
      }

      case "clear": {
        if (!cartId) {
          return ok(emptyCartPayload())
        }
        const payload = await clearShopifyCart(cartId, { buyerIp })
        return ok(payload)
      }

      case "attachCustomer": {
        if (!cartId) {
          return ok(emptyCartPayload())
        }
        const attached = await attachCustomerToCart(cartId, { buyerIp })
        if (attached) return ok(attached)
        const payload = await fetchShopifyCart(cartId, { buyerIp })
        return ok(payload)
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
