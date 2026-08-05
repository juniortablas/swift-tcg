import type { CartAction, CartState } from "./types"

export const initialCartState: CartState = {
  items: [],
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return {
        items: Array.isArray(action.payload.items) ? action.payload.items : [],
      }

    case "ADD_ITEM": {
      const quantity = Math.max(1, action.payload.quantity ?? 1)
      const existing = state.items.find((item) => item.id === action.payload.id)

      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        }
      }

      return {
        items: [
          ...state.items,
          {
            id: action.payload.id,
            title: action.payload.title,
            image: action.payload.image,
            price: action.payload.price,
            quantity,
            slug: action.payload.slug,
            url: action.payload.url,
          },
        ],
      }
    }

    case "REMOVE_ITEM":
      return {
        items: state.items.filter((item) => item.id !== action.payload.id),
      }

    case "UPDATE_QUANTITY": {
      const quantity = Math.floor(action.payload.quantity)

      if (quantity <= 0) {
        return {
          items: state.items.filter((item) => item.id !== action.payload.id),
        }
      }

      return {
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, quantity } : item
        ),
      }
    }

    case "CLEAR_CART":
      return initialCartState

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
