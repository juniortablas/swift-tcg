/**
 * Newsletter subscribe domain types.
 * Capture goes through Shopify Admin customer create / consent update.
 */

/** Where the signup form lives — used for GA4 `placement`. */
export type NewsletterSource = "homepage" | "footer" | "maintenance"

export type NewsletterSubscribeInput = {
  email: string
  source?: NewsletterSource
  /** Honeypot field. Any non-empty value is treated as a bot. */
  website?: string
}

export type NewsletterSubscribeResult = {
  success: boolean
  message: string
}

export type NewsletterSubscribeFailureReason =
  | "invalid_email"
  | "rate_limited"
  | "error"

export type NewsletterSubscribeOutcome =
  | { ok: true; message: string }
  | {
      ok: false
      reason: NewsletterSubscribeFailureReason
      message: string
    }
