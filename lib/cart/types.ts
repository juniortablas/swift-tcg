/**
 * Storefront cart types.
 *
 * Cart UI depends on this shape. Shopify Cart API lines are mapped into
 * `CartItem` by `lib/shopify/cart.ts`.
 */

/** Purchase kind used to enforce preorder / in-stock cart separation. */
export type CartItemKind = "instock" | "preorder"

export type CartItem = {
  /** Shopify cart line id — used for remove / update quantity. */
  id: string
  /** Shopify product GID — used for mixed-cart / same-product matching. */
  productId: string
  /** Shopify variant GID (merchandiseId). */
  merchandiseId?: string
  title: string
  image: string
  /** Unit price. Null when price is unavailable. */
  price: number | null
  quantity: number
  /** Whether this line is a preorder or in-stock purchase. */
  status: CartItemKind
  /** Tracked inventory remaining; null when untracked / CONTINUE at 0. */
  quantityAvailable?: number | null
  slug?: string
  url?: string
}

export type CartState = {
  items: CartItem[]
  checkoutUrl?: string | null
  cartId?: string | null
}

/**
 * Input from product UI. `id` is the Shopify **product** GID;
 * the cart API resolves the variant server-side.
 */
export type AddItemInput = {
  id: string
  title: string
  image: string
  price: number | null
  status: CartItemKind
  quantity?: number
  slug?: string
  url?: string
}

export type CartAction =
  | { type: "HYDRATE"; payload: CartState }
  | { type: "SET_CHECKOUT_URL"; payload: string | null }

export type CartContextValue = {
  items: CartItem[]
  itemCount: number
  subtotal: number
  checkoutUrl: string | null
  isOpen: boolean
  isHydrated: boolean
  /**
   * Adds an item when allowed. Returns `true` if the add was accepted locally
   * (Shopify sync runs async). Returns `false` if blocked by sold-out or
   * mixed-cart rules (conflict dialog is shown for mixed cart).
   */
  addItem: (item: AddItemInput) => boolean
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

/** Shape returned by `/api/cart` — safe for client consumption. */
export type CartApiResponse = {
  cartId: string | null
  checkoutUrl: string | null
  items: CartItem[]
  itemCount: number
  subtotal: number
  error?: { code?: string; message?: string }
}
