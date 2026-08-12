/**
 * Newsletter subscribe domain types.
 * Provider-agnostic so Klaviyo, Shopify Email, or another ESP can plug in later.
 */

export type NewsletterProviderId = "none" | "klaviyo" | "shopify"

/** Where the signup form lives — useful for ESP source attribution. */
export type NewsletterSource = "homepage" | "footer" | "maintenance" | "unknown"

export type NewsletterSubscribeStatus =
  | "subscribed"
  | "already_subscribed"
  | "invalid_email"
  | "provider_not_configured"
  | "error"

export type NewsletterSubscribeInput = {
  email: string
  source?: NewsletterSource
}

export type NewsletterSubscribeResult = {
  status: NewsletterSubscribeStatus
  message: string
}
