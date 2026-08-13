/**
 * Storefront Cart API helpers.
 *
 * Server-only — call from API routes / RSC, never from the browser
 * (private Storefront tokens must not leave the server).
 */

import type { CartItem, CartItemKind } from "@/lib/cart/types"
import { normalizeCartItemKind } from "@/lib/cart/mixedCart"
import {
  parseBooleanMetafield,
  parseIntegerMetafield,
  shouldMapWeeklyRestock,
  WEEKLY_RESTOCK_ATTRIBUTE,
  weeklyRestockLimitMessage,
} from "@/lib/product/weeklyRestock"
import {
  captureWeeklyRestockFailure,
  remainingFromMetafields,
} from "./weeklyRestockReservations"
import {
  overlayReservationRemaining,
  peekReservationSession,
  rememberReservationSession,
  resolveReservationSession,
  sessionFromCartPayload,
  type ReservationSession,
} from "./weeklyRestockCartCache"

import { ShopifyClientError, shopifyFetch } from "./client"
import { isShopifyThrottledError } from "./throttle"
import { GET_CART, GET_PRODUCT_FOR_CART } from "./cartFields"
import {
  CART_ATTRIBUTES_UPDATE,
  CART_CREATE,
  CART_LINES_ADD,
  CART_LINES_REMOVE,
  CART_LINES_UPDATE,
} from "./mutations"
import type {
  CartAttributesUpdateResult,
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

/** Cart mutations/reads must never hit the Data Cache. */
const CART_FETCH = { cache: "no-store" as const }

/** Line attribute key for preorder / in-stock separation. */
export const CART_STATUS_ATTRIBUTE = "_status"

export type CartPayload = {
  cartId: string | null
  checkoutUrl: string | null
  items: CartItem[]
  itemCount: number
  subtotal: number
  /** True when the Shopify cart attribute `weekly_restock=true` is set. */
  weeklyRestock?: boolean
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
    weeklyRestock: false,
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

function weeklyRestockFromAttributes(
  attributes: Array<{ key: string; value: string }> | undefined
): boolean {
  return (
    attributes?.some(
      (attribute) =>
        attribute.key === WEEKLY_RESTOCK_ATTRIBUTE &&
        attribute.value === "true"
    ) === true
  )
}

function isWeeklyRestockProduct(product: ProductForCart): boolean {
  return shouldMapWeeklyRestock({
    tags: product.tags,
    availableForSale: product.availableForSale,
    totalInventory: product.totalInventory,
    allowWeeklyRestock: parseBooleanMetafield(
      product.allowWeeklyRestock?.value
    ),
  })
}

function weeklyRestockLimitOf(product: {
  weeklyRestockLimit?: { value?: string | null } | null
}): number {
  return parseIntegerMetafield(product.weeklyRestockLimit?.value)
}

function reservationRemainingOf(product: {
  id?: string
  weeklyRestockLimit?: { value?: string | null } | null
  currentWeeklyReservations?: { value?: string | null } | null
}): { remaining: number; failed: boolean } {
  const read = remainingFromMetafields(
    product.weeklyRestockLimit?.value,
    product.currentWeeklyReservations?.value
  )
  if (!read.ok) {
    captureWeeklyRestockFailure(
      new Error("weekly restock counter unreadable"),
      { productId: product.id }
    )
    return { remaining: 0, failed: true }
  }
  return { remaining: read.remaining, failed: false }
}

export type MapShopifyCartOptions = {
  /**
   * When true, remaining comes from product metafields (cart load / add /
   * checkout). Mutations must leave this false and overlay the session cache.
   */
  readRestockMetafields?: boolean
}

/**
 * Map a Shopify Storefront cart into app cart lines.
 */
export function mapShopifyCart(
  cart: ShopifyCart | null | undefined,
  options?: MapShopifyCartOptions
): CartPayload {
  if (!cart) return emptyCartPayload()

  const readRestockMetafields = options?.readRestockMetafields === true
  const items: CartItem[] = []

  for (const { node } of cart.lines.edges) {
    const merchandise = node.merchandise
    if (!merchandise?.product) continue

    const product = merchandise.product
    const image =
      merchandise.image?.url || product.featuredImage?.url || ""
    const reserved = weeklyRestockFromAttributes(node.attributes)

    items.push({
      id: node.id,
      productId: product.id,
      merchandiseId: merchandise.id,
      title: product.title,
      image,
      price: parsePrice(merchandise.price?.amount),
      quantity: node.quantity,
      status: statusFromAttributes(node.attributes),
      weeklyRestock: reserved,
      weeklyRestockLimit: readRestockMetafields
        ? weeklyRestockLimitOf(product)
        : undefined,
      quantityAvailable: reserved
        ? readRestockMetafields
          ? reservationRemainingOf(product).remaining
          : null
        : (merchandise.quantityAvailable ?? null),
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
    weeklyRestock: weeklyRestockFromAttributes(cart.attributes),
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

function mapMutationCart(cart: ShopifyCart): CartPayload {
  const payload = mapShopifyCart(cart, { readRestockMetafields: false })
  return overlayReservationRemaining(
    payload,
    payload.cartId ? peekReservationSession(payload.cartId) : null
  )
}

function rememberCartReservations(payload: CartPayload): CartPayload {
  rememberReservationSession(sessionFromCartPayload(payload))
  return payload
}

function applyKnownReservationRemaining(
  payload: CartPayload,
  productId: string,
  remaining: number,
  limit: number
): CartPayload {
  const items = payload.items.map((item) => {
    if (!item.weeklyRestock || item.productId !== productId) return item
    return {
      ...item,
      quantityAvailable: remaining,
      weeklyRestockLimit: limit,
    }
  })
  return rememberCartReservations({ ...payload, items })
}

function throwInventoryError(message: string): never {
  const err: CartOperationError = {
    code: "inventory",
    message,
  }
  throw Object.assign(new Error(message), err)
}

async function updateShopifyCartAttributes(
  cartId: string,
  attributes: Array<{ key: string; value: string }>,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const data = await shopifyFetch<CartAttributesUpdateResult>({
    query: CART_ATTRIBUTES_UPDATE,
    variables: { cartId, attributes },
    buyerIp: options?.buyerIp,
    ...CART_FETCH,
  })
  return mapMutationCart(throwOnUserErrors(data.cartAttributesUpdate))
}

/**
 * Keep cart attribute `weekly_restock=true` in sync with reserved lines
 * so the order is tagged at checkout without a separate API.
 */
async function syncWeeklyRestockCartAttribute(
  cart: CartPayload,
  options?: CartFetchOptions
): Promise<CartPayload> {
  if (!cart.cartId) return cart

  const hasReservedLines = cart.items.some((item) => item.weeklyRestock)
  if (Boolean(cart.weeklyRestock) === hasReservedLines) return cart

  const desired = hasReservedLines ? "true" : ""

  return updateShopifyCartAttributes(
    cart.cartId,
    [{ key: WEEKLY_RESTOCK_ATTRIBUTE, value: desired }],
    options
  )
}

async function finalizeCart(
  cart: CartPayload,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const synced = await syncWeeklyRestockCartAttribute(cart, options)
  return overlayReservationRemaining(
    synced,
    options?.reservationSession ??
      (synced.cartId ? peekReservationSession(synced.cartId) : sessionFromCartPayload(cart))
  )
}

export type CartFetchOptions = {
  buyerIp?: string
  /** Cached remaining from the cart session cookie (60s). */
  reservationSession?: ReservationSession | null
}

export async function fetchShopifyCart(
  cartId: string,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const data = await shopifyFetch<GetCartResult>({
    query: GET_CART,
    variables: { cartId },
    buyerIp: options?.buyerIp,
    ...CART_FETCH,
  })
  return rememberCartReservations(
    mapShopifyCart(data.cart, { readRestockMetafields: true })
  )
}

export async function fetchProductForCart(
  productId: string,
  options?: CartFetchOptions
): Promise<ProductForCart | null> {
  const data = await shopifyFetch<GetProductForCartResult>({
    query: GET_PRODUCT_FOR_CART,
    variables: { id: productId },
    buyerIp: options?.buyerIp,
    ...CART_FETCH,
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
  status: CartItemKind,
  weeklyRestock = false
) {
  const attributes: Array<{ key: string; value: string }> = [
    { key: CART_STATUS_ATTRIBUTE, value: status },
  ]
  if (weeklyRestock) {
    attributes.push({ key: WEEKLY_RESTOCK_ATTRIBUTE, value: "true" })
  }
  return {
    merchandiseId,
    quantity,
    attributes,
  }
}

export async function createShopifyCart(
  merchandiseId: string,
  quantity: number,
  status: CartItemKind,
  options?: CartFetchOptions,
  weeklyRestock = false
): Promise<CartPayload> {
  const data = await shopifyFetch<CartCreateResult>({
    query: CART_CREATE,
    variables: {
      input: {
        lines: [lineInput(merchandiseId, quantity, status, weeklyRestock)],
        ...(weeklyRestock
          ? {
              attributes: [
                { key: WEEKLY_RESTOCK_ATTRIBUTE, value: "true" },
              ],
            }
          : {}),
      },
    },
    buyerIp: options?.buyerIp,
    ...CART_FETCH,
  })
  return mapMutationCart(throwOnUserErrors(data.cartCreate))
}

export async function addShopifyCartLines(
  cartId: string,
  merchandiseId: string,
  quantity: number,
  status: CartItemKind,
  options?: CartFetchOptions,
  weeklyRestock = false
): Promise<CartPayload> {
  const data = await shopifyFetch<CartLinesAddResult>({
    query: CART_LINES_ADD,
    variables: {
      cartId,
      lines: [lineInput(merchandiseId, quantity, status, weeklyRestock)],
    },
    buyerIp: options?.buyerIp,
    ...CART_FETCH,
  })
  return mapMutationCart(throwOnUserErrors(data.cartLinesAdd))
}

export async function updateShopifyCartLines(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const toRemove = lines.filter((line) => line.quantity <= 0).map((line) => line.id)
  const toUpdate = lines.filter((line) => line.quantity > 0)

  let payload: CartPayload | null = null

  if (toUpdate.length > 0) {
    const data = await shopifyFetch<CartLinesUpdateResult>({
      query: CART_LINES_UPDATE,
      variables: { cartId, lines: toUpdate },
      buyerIp: options?.buyerIp,
      ...CART_FETCH,
    })
    payload = mapMutationCart(throwOnUserErrors(data.cartLinesUpdate))
  }

  if (toRemove.length > 0) {
    payload = await removeShopifyCartLines(cartId, toRemove, options)
  }

  if (!payload) {
    return overlayReservationRemaining(
      emptyCartPayload(),
      peekReservationSession(cartId)
    )
  }

  return overlayReservationRemaining(payload, peekReservationSession(cartId))
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
    ...CART_FETCH,
  })
  const payload = mapMutationCart(throwOnUserErrors(data.cartLinesRemove))
  return finalizeCart(payload, options)
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
  const weeklyRestock = isWeeklyRestockProduct(product)
  if (!variant || (!variant.availableForSale && !weeklyRestock)) {
    const err: CartOperationError = {
      code: "sold_out",
      message: "This product is sold out.",
    }
    throw Object.assign(new Error(err.message), err)
  }

  const reservation = weeklyRestock
    ? reservationRemainingOf(product)
    : null

  if (weeklyRestock && (reservation?.failed || (reservation?.remaining ?? 0) <= 0)) {
    const err: CartOperationError = {
      code: "sold_out",
      message: "This product is sold out.",
    }
    throw Object.assign(new Error(err.message), err)
  }

  const reservationRemaining = reservation?.remaining ?? null

  let current: CartPayload = emptyCartPayload()
  if (input.cartId) {
    try {
      current = await fetchShopifyCart(input.cartId, options)
    } catch (error) {
      if (isShopifyThrottledError(error)) throw error
      if (
        error instanceof ShopifyClientError &&
        error.status != null &&
        error.status >= 500
      ) {
        throw error
      }
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

  if (weeklyRestock && reservationRemaining != null) {
    if (existingQty + quantity > reservationRemaining) {
      const err: CartOperationError = {
        code: "inventory",
        message: weeklyRestockLimitMessage(reservationRemaining),
      }
      throw Object.assign(new Error(err.message), err)
    }
  } else if (exceedsAvailableInventory(variant, quantity, existingQty)) {
    const err: CartOperationError = {
      code: "inventory",
      message: `Only ${variant.quantityAvailable} available.`,
    }
    throw Object.assign(new Error(err.message), err)
  }

  if (!current.cartId) {
    const created = await createShopifyCart(
      variant.id,
      quantity,
      status,
      options,
      weeklyRestock
    )
    const finalized = await finalizeCart(created, options)
    if (weeklyRestock && reservationRemaining != null) {
      return applyKnownReservationRemaining(
        finalized,
        product.id,
        reservationRemaining,
        weeklyRestockLimitOf(product)
      )
    }
    return finalized
  }

  const added = await addShopifyCartLines(
    current.cartId,
    variant.id,
    quantity,
    status,
    options,
    weeklyRestock
  )
  const finalized = await finalizeCart(added, options)
  if (weeklyRestock && reservationRemaining != null) {
    return applyKnownReservationRemaining(
      finalized,
      product.id,
      reservationRemaining,
      weeklyRestockLimitOf(product)
    )
  }
  return finalized
}

function validateReservationQuantities(
  lines: Array<{ lineId: string; quantity: number }>,
  items: CartItem[]
): void {
  for (const update of lines) {
    const qty = Math.floor(update.quantity)
    const line = items.find((item) => item.id === update.lineId)
    if (!line) continue
    if (qty <= 0) continue

    const available = line.quantityAvailable
    if (line.weeklyRestock) {
      const remaining = available ?? 0
      if (qty > remaining) {
        throwInventoryError(weeklyRestockLimitMessage(remaining))
      }
    } else if (available != null && available > 0 && qty > available) {
      throwInventoryError(`Only ${available} available.`)
    }
  }
}

function itemsFromReservationSession(
  session: ReservationSession
): CartItem[] {
  return Object.entries(session.lines).map(([id, line]) => ({
    id,
    productId: line.productId,
    title: "",
    image: "",
    price: null,
    quantity: 1,
    status: "instock",
    weeklyRestock: true,
    weeklyRestockLimit: line.limit,
    quantityAvailable: line.remaining,
  }))
}

/**
 * Update one or more line quantities in a single Storefront mutation.
 * Reservation remaining comes from the cart/session cache — this path
 * does not read Admin GraphQL or reservation metafields.
 */
export async function updateCartLineQuantities(
  cartId: string,
  lines: Array<{ lineId: string; quantity: number }>,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const updates = lines.map((line) => ({
    lineId: line.lineId,
    quantity: Math.floor(line.quantity),
  }))

  if (updates.length === 0) {
    return fetchShopifyCart(cartId, options)
  }

  let session = resolveReservationSession(cartId, options?.reservationSession)

  if (!session) {
    const current = await fetchShopifyCart(cartId, options)
    session = sessionFromCartPayload(current)
    validateReservationQuantities(updates, current.items)
  } else {
    validateReservationQuantities(
      updates,
      itemsFromReservationSession(session)
    )
  }

  const updated = await updateShopifyCartLines(
    cartId,
    updates.map((line) => ({ id: line.lineId, quantity: line.quantity })),
    options
  )
  return overlayReservationRemaining(updated, session)
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
  return updateCartLineQuantities(
    cartId,
    [{ lineId, quantity }],
    options
  )
}

/**
 * Re-read reservation metafields before checkout. Quantity clicks never
 * take this path.
 */
export async function prepareShopifyCheckout(
  cartId: string,
  options?: CartFetchOptions
): Promise<CartPayload> {
  const cart = await fetchShopifyCart(cartId, options)
  for (const item of cart.items) {
    if (!item.weeklyRestock) continue
    const remaining = item.quantityAvailable ?? 0
    if (item.quantity > remaining) {
      throwInventoryError(weeklyRestockLimitMessage(remaining))
    }
  }
  return cart
}

export { emptyCartPayload }
