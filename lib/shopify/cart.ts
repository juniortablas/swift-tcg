/**
 * Storefront Cart API helpers.
 *
 * Server-only — call from API routes / RSC, never from the browser
 * (private Storefront tokens must not leave the server).
 */

import type { CartItem, CartItemKind } from "@/lib/cart/types"
import { normalizeCartItemKind } from "@/lib/cart/mixedCart"

import { shopifyFetch } from "./client"
import { GET_CART, GET_PRODUCT_FOR_CART } from "./cartFields"
import {
  CART_CREATE,
  CART_LINES_ADD,
  CART_LINES_REMOVE,
  CART_LINES_UPDATE,
} from "./mutations"
import type {
  CartCreateResult,
  CartLinesAddResult,
  CartLinesRemoveResult,
  CartLinesUpdateResult,
  CartMutationPayload,
  CartUserError,
  GetCartResult,
  GetProductForCartResult,
  ProductForCart,
  ProductForCartVariant,
  ShopifyCart,
} from "./types"

/** Line attribute key for preorder / in-stock separation. */
export const CART_STATUS_ATTRIBUTE = "_status"

export type CartPayload = {
  cartId: string | null
  checkoutUrl: string | null
  items: CartItem[]
  itemCount: number
  subtotal: number
}

export type CartOperationError = {
  code:
    | "sold_out"
    | "inventory"
    | "mixed_cart"
    | "not_found"
    | "shopify"
    | "invalid"
  message: string
  userErrors?: CartUserError[]
}

function emptyCartPayload(): CartPayload {
  return {
    cartId: null,
    checkoutUrl: null,
    items: [],
    itemCount: 0,
    subtotal: 0,
  }
}

function parsePrice(amount: string | undefined): number | null {
  if (amount == null || amount === "") return null
  const value = Number.parseFloat(amount)
  return Number.isFinite(value) ? value : null
}

function statusFromAttributes(
  attributes: Array<{ key: string; value: string }> | undefined
): CartItemKind {
  const raw = attributes?.find((a) => a.key === CART_STATUS_ATTRIBUTE)?.value
  return normalizeCartItemKind(raw as CartItemKind | undefined)
}

/**
 * Map a Shopify Storefront cart into app cart lines.
 */
export function mapShopifyCart(
  cart: ShopifyCart | null | undefined
): CartPayload {
  if (!cart) return emptyCartPayload()

  const items: CartItem[] = []

  for (const { node } of cart.lines.edges) {
    const merchandise = node.merchandise
    if (!merchandise?.product) continue

    const product = merchandise.product
    const image =
      merchandise.image?.url || product.featuredImage?.url || ""

    items.push({
      id: node.id,
      productId: product.id,
      merchandiseId: merchandise.id,
      title: product.title,
      image,
      price: parsePrice(merchandise.price?.amount),
      quantity: node.quantity,
      status: statusFromAttributes(node.attributes),
      quantityAvailable: merchandise.quantityAvailable ?? null,
      slug: product.handle,
      url: `/products/${product.handle}`,
    })
  }

  const subtotalFromCost = parsePrice(cart.cost?.subtotalAmount?.amount)
  const subtotal =
    subtotalFromCost ??
    items.reduce((sum, item) => {
      if (typeof item.price !== "number") return sum
      return sum + item.price * item.quantity
    }, 0)

  return {
    cartId: cart.id,
    checkoutUrl: cart.checkoutUrl || null,
    items,
    itemCount:
      cart.totalQuantity ?? items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
  }
}

function throwOnUserErrors(payload: CartMutationPayload): ShopifyCart {
  if (payload.userErrors?.length) {
    const message = payload.userErrors.map((e) => e.message).join("; ")
    const lower = message.toLowerCase()
    const code: CartOperationError["code"] =
      lower.includes("sold out") || lower.includes("not available")
        ? "sold_out"
        : lower.includes("quantit") ||
            lower.includes("inventor") ||
            lower.includes("not enough")
          ? "inventory"
          : "shopify"
    const err: CartOperationError = {
      code,
      message,
      userErrors: payload.userErrors,
    }
    throw Object.assign(new Error(message), err)
  }
  if (!payload.cart) {
    const err: CartOperationError = {
      code: "not_found",
      message: "Shopify cart was not returned.",
    }
    throw Object.assign(new Error(err.message), err)
  }
  return payload.cart
}

export type CartFetchOptions = {
  buyerIp?: string
}

export async function fetchShopifyCart(
  cartId: string,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const data = await shopifyFetch<GetCartResult>({
    query: GET_CART,
    variables: { cartId },
    buyerIp: options?.buyerIp,
  })
  return mapShopifyCart(data.cart)
}

export async function fetchProductForCart(
  productId: string,
  options?: CartFetchOptions
): Promise<ProductForCart | null> {
  const data = await shopifyFetch<GetProductForCartResult>({
    query: GET_PRODUCT_FOR_CART,
    variables: { id: productId },
    buyerIp: options?.buyerIp,
  })
  return data.product
}

/**
 * Pick the first sellable variant. Prefers availableForSale variants.
 */
export function resolveMerchandise(
  product: ProductForCart
): ProductForCartVariant | null {
  const variants = product.variants.edges.map((e) => e.node)
  if (variants.length === 0) return null
  return variants.find((v) => v.availableForSale) ?? variants[0] ?? null
}

/**
 * Whether adding `quantity` would exceed tracked inventory.
 * When quantityAvailable is null, inventory is untracked — allow and let
 * Shopify cart mutations reject overselling.
 * When quantityAvailable is 0 but availableForSale, allow (CONTINUE policy).
 */
export function exceedsAvailableInventory(
  variant: ProductForCartVariant,
  quantity: number,
  alreadyInCart = 0
): boolean {
  const available = variant.quantityAvailable
  if (available == null) return false
  if (available <= 0) return false
  return alreadyInCart + quantity > available
}

export function cartHasMixedConflict(
  items: CartItem[],
  incomingStatus: CartItemKind,
  productId: string
): boolean {
  if (items.length === 0) return false
  if (items.some((item) => item.productId === productId)) return false

  const cartHasPreorder = items.some(
    (item) => normalizeCartItemKind(item.status) === "preorder"
  )
  const cartHasInstock = items.some(
    (item) => normalizeCartItemKind(item.status) === "instock"
  )

  if (incomingStatus === "preorder" && cartHasInstock) return true
  if (incomingStatus === "instock" && cartHasPreorder) return true
  return false
}

function lineInput(
  merchandiseId: string,
  quantity: number,
  status: CartItemKind
) {
  return {
    merchandiseId,
    quantity,
    attributes: [{ key: CART_STATUS_ATTRIBUTE, value: status }],
  }
}

export async function createShopifyCart(
  merchandiseId: string,
  quantity: number,
  status: CartItemKind,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const data = await shopifyFetch<CartCreateResult>({
    query: CART_CREATE,
    variables: {
      input: {
        lines: [lineInput(merchandiseId, quantity, status)],
      },
    },
    buyerIp: options?.buyerIp,
  })
  return mapShopifyCart(throwOnUserErrors(data.cartCreate))
}

export async function addShopifyCartLines(
  cartId: string,
  merchandiseId: string,
  quantity: number,
  status: CartItemKind,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const data = await shopifyFetch<CartLinesAddResult>({
    query: CART_LINES_ADD,
    variables: {
      cartId,
      lines: [lineInput(merchandiseId, quantity, status)],
    },
    buyerIp: options?.buyerIp,
  })
  return mapShopifyCart(throwOnUserErrors(data.cartLinesAdd))
}

export async function updateShopifyCartLines(
  cartId: string,
  lineId: string,
  quantity: number,
  options?: CartFetchOptions
): Promise<CartPayload> {
  if (quantity <= 0) {
    return removeShopifyCartLines(cartId, [lineId], options)
  }

  const data = await shopifyFetch<CartLinesUpdateResult>({
    query: CART_LINES_UPDATE,
    variables: {
      cartId,
      lines: [{ id: lineId, quantity }],
    },
    buyerIp: options?.buyerIp,
  })
  return mapShopifyCart(throwOnUserErrors(data.cartLinesUpdate))
}

export async function removeShopifyCartLines(
  cartId: string,
  lineIds: string[],
  options?: CartFetchOptions
): Promise<CartPayload> {
  if (lineIds.length === 0) {
    return fetchShopifyCart(cartId, options)
  }

  const data = await shopifyFetch<CartLinesRemoveResult>({
    query: CART_LINES_REMOVE,
    variables: { cartId, lineIds },
    buyerIp: options?.buyerIp,
  })
  return mapShopifyCart(throwOnUserErrors(data.cartLinesRemove))
}

export async function clearShopifyCart(
  cartId: string,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const current = await fetchShopifyCart(cartId, options)
  if (!current.cartId || current.items.length === 0) {
    return {
      ...emptyCartPayload(),
      cartId,
      checkoutUrl: current.checkoutUrl,
    }
  }

  const lineIds = current.items.map((item) => item.id)
  const cleared = await removeShopifyCartLines(cartId, lineIds, options)
  return {
    ...cleared,
    cartId: cleared.cartId ?? cartId,
    checkoutUrl: cleared.checkoutUrl,
  }
}

export type AddToCartInput = {
  cartId?: string | null
  productId: string
  quantity?: number
  status: CartItemKind
  /** When true, skip mixed-cart check (after explicit clear-and-add). */
  skipMixedCheck?: boolean
}

/**
 * Resolve merchandise, enforce sold-out / inventory / mixed-cart rules,
 * then create or update the Shopify cart.
 */
export async function addProductToShopifyCart(
  input: AddToCartInput,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1))
  const status = normalizeCartItemKind(input.status)

  const product = await fetchProductForCart(input.productId, options)
  if (!product) {
    const err: CartOperationError = {
      code: "not_found",
      message: "Product not found.",
    }
    throw Object.assign(new Error(err.message), err)
  }

  const variant = resolveMerchandise(product)
  if (!variant || !variant.availableForSale) {
    const err: CartOperationError = {
      code: "sold_out",
      message: "This product is sold out.",
    }
    throw Object.assign(new Error(err.message), err)
  }

  let current: CartPayload = emptyCartPayload()
  if (input.cartId) {
    try {
      current = await fetchShopifyCart(input.cartId, options)
    } catch {
      current = emptyCartPayload()
    }
  }

  if (
    !input.skipMixedCheck &&
    cartHasMixedConflict(current.items, status, input.productId)
  ) {
    const err: CartOperationError = {
      code: "mixed_cart",
      message:
        "Preorder items must be purchased separately from in-stock items.",
    }
    throw Object.assign(new Error(err.message), err)
  }

  const existingQty =
    current.items.find((item) => item.productId === input.productId)
      ?.quantity ?? 0

  if (exceedsAvailableInventory(variant, quantity, existingQty)) {
    const err: CartOperationError = {
      code: "inventory",
      message: `Only ${variant.quantityAvailable} available.`,
    }
    throw Object.assign(new Error(err.message), err)
  }

  if (!current.cartId) {
    return createShopifyCart(variant.id, quantity, status, options)
  }

  return addShopifyCartLines(
    current.cartId,
    variant.id,
    quantity,
    status,
    options
  )
}

/**
 * Update a line quantity with inventory ceiling when tracked stock > 0.
 */
export async function updateCartLineQuantity(
  cartId: string,
  lineId: string,
  quantity: number,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const qty = Math.floor(quantity)
  if (qty <= 0) {
    return removeShopifyCartLines(cartId, [lineId], options)
  }

  const current = await fetchShopifyCart(cartId, options)
  const line = current.items.find((item) => item.id === lineId)
  if (!line) {
    const err: CartOperationError = {
      code: "not_found",
      message: "Cart line not found.",
    }
    throw Object.assign(new Error(err.message), err)
  }

  const available = line.quantityAvailable
  if (available != null && available > 0 && qty > available) {
    const err: CartOperationError = {
      code: "inventory",
      message: `Only ${available} available.`,
    }
    throw Object.assign(new Error(err.message), err)
  }

  return updateShopifyCartLines(cartId, lineId, qty, options)
}

export { emptyCartPayload }
