export type BisSubscriptionView = {
  productId: string
  subscribedAt: string
}

export type BisPayload = {
  subscriptions: BisSubscriptionView[]
  productIds: string[]
  loggedIn: boolean
}

export type BisApiError = {
  code:
    | "auth_required"
    | "invalid"
    | "shopify"
    | "limit"
    | "already_available"
    | "email_not_configured"
  message: string
}

export type BisApiResponse = BisPayload & {
  added?: boolean
  removed?: boolean
  error?: BisApiError
}

export type BisContextValue = {
  productIds: string[]
  subscriptions: BisSubscriptionView[]
  isHydrated: boolean
  loggedIn: boolean
  isSubscribed: (productId: string) => boolean
  statusFor: (productId: string) => "idle" | "pending" | "success" | "error"
  lastError: string | null
  subscribe: (productId: string) => void
  unsubscribe: (productId: string) => void
  toggle: (productId: string) => void
}
