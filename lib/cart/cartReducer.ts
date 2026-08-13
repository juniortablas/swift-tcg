import { normalizeCartItemKind } from "./mixedCart"
import type { CartAction, CartItem, CartState } from "./types"

export const initialCartState: CartState = {
  items: [],
  checkoutUrl: null,
  cartId: null,
}

function normalizeCartItem(item: CartItem): CartItem {
  return {
    ...item,
    productId: item.productId || item.id,
    status: normalizeCartItemKind(item.status),
    quantity: Math.max(1, Math.floor(item.quantity) || 1),
  }
}

/**
 * Cart line state is owned by Shopify. The reducer only hydrates from
 * API responses (and clears locally when needed).
 */
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return {
        items: Array.isArray(action.payload.items)
          ? action.payload.items.map((item) =>
              normalizeCartItem(item as CartItem)
            )
          : [],
        checkoutUrl: action.payload.checkoutUrl ?? null,
        cartId: action.payload.cartId ?? null,
      }

    case "SET_LINE_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => item.id !== action.lineId),
        }
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.lineId
            ? { ...item, quantity: Math.max(1, Math.floor(action.quantity)) }
            : item
        ),
      }
    }

    case "SET_CHECKOUT_URL":
      return { ...state, checkoutUrl: action.payload }

    default:
      return state
  }
}

export function getItemCount(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.quantity, 0)
}

export function getSubtotal(state: CartState): number {
  return state.items.reduce((sum, item) => {
    if (typeof item.price !== "number") return sum
    return sum + item.price * item.quantity
  }, 0)
}
