/**
 * Storefront-agnostic cart types.
 *
 * Cart UI and state depend only on this shape. When Shopify is wired later,
 * map Storefront API line items into `CartItem` — no consumer changes required.
 */

export type CartItem = {
  id: string
  title: string
  image: string
  /** Unit price in JPY. Null when price is unavailable. */
  price: number | null
  quantity: number
  slug?: string
  url?: string
}

export type CartState = {
  items: CartItem[]
}

export type AddItemInput = Omit<CartItem, "quantity"> & {
  quantity?: number
}

export type CartAction =
  | { type: "ADD_ITEM"; payload: AddItemInput }
  | { type: "REMOVE_ITEM"; payload: { id: string } }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; payload: CartState }

export type CartContextValue = {
  items: CartItem[]
  itemCount: number
  subtotal: number
  isOpen: boolean
  isHydrated: boolean
  addItem: (item: AddItemInput) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}
