import type { CartItem, CartItemKind } from "./types"
import type { ProductStatus } from "@/types/product"

export const MIXED_CART_MESSAGE =
  "Preorder items must be purchased separately from in-stock items."

/**
 * Map a product status into a cart purchase kind.
 * Returns `null` for sold out / unknown — those must never enter the cart.
 */
export function toCartItemKind(status: ProductStatus): CartItemKind | null {
  if (status === "preorder") return "preorder"
  if (status === "instock") return "instock"
  return null
}

export function normalizeCartItemKind(
  status: CartItemKind | undefined
): CartItemKind {
  return status === "preorder" ? "preorder" : "instock"
}

/** Cart lines require a priced instock or preorder item. */
export function isCartAddAllowed(item: {
  price: number | null
  status: CartItemKind | undefined
}): boolean {
  if (typeof item.price !== "number" || item.price <= 0) return false
  return item.status === "instock" || item.status === "preorder"
}

/**
 * Product GID for mixed-cart / same-line matching.
 * AddItemInput uses `id` as the product GID; CartItem uses `productId`.
 */
export function cartProductId(item: {
  id: string
  productId?: string
}): string {
  return item.productId ?? item.id
}

/**
 * Returns true when adding `incoming` would mix preorder and in-stock lines.
 * Increasing quantity of an existing product line is always allowed.
 */
export function wouldCreateMixedCart(
  items: CartItem[],
  incoming: { id: string; productId?: string; status: CartItemKind }
): boolean {
  if (items.length === 0) return false

  const incomingProductId = cartProductId(incoming)
  if (items.some((item) => cartProductId(item) === incomingProductId)) {
    return false
  }

  const cartHasPreorder = items.some(
    (item) => normalizeCartItemKind(item.status) === "preorder"
  )
  const cartHasInstock = items.some(
    (item) => normalizeCartItemKind(item.status) === "instock"
  )
  const incomingIsPreorder = incoming.status === "preorder"

  if (incomingIsPreorder && cartHasInstock) return true
  if (!incomingIsPreorder && cartHasPreorder) return true
  return false
}
