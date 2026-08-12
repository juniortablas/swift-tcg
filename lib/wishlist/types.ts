export type WishlistPayload = {
  productIds: string[]
  loggedIn: boolean
}

export type WishlistApiError = {
  code: "auth_required" | "invalid" | "shopify" | "limit"
  message: string
}

export type WishlistApiResponse = WishlistPayload & {
  added?: boolean
  removed?: boolean
  error?: WishlistApiError
}

export type WishlistContextValue = {
  productIds: string[]
  isHydrated: boolean
  loggedIn: boolean
  isInWishlist: (productId: string) => boolean
  toggle: (productId: string) => void
  remove: (productId: string) => void
  add: (productId: string) => void
}
