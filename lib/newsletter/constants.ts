import type { NewsletterSource } from "@/lib/newsletter/types"

export const NEWSLETTER_SUCCESS_MESSAGE = "Thanks for subscribing!"
export const NEWSLETTER_INVALID_EMAIL_MESSAGE = "Enter a valid email address."
export const NEWSLETTER_RATE_LIMIT_MESSAGE =
  "Too many attempts. Please try again later."
export const NEWSLETTER_ERROR_MESSAGE =
  "Something went wrong. Please try again."

/** RFC 5321 path length limit. */
export const NEWSLETTER_EMAIL_MAX_LENGTH = 254

/** Hidden form field used as a bot honeypot. */
export const NEWSLETTER_HONEYPOT_FIELD = "website"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Normalize and validate a newsletter email.
 * Trims whitespace, lowercases, strips control characters.
 */
export function sanitizeNewsletterEmail(value: unknown): string | null {
  if (typeof value !== "string") return null

  const email = value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .toLowerCase()

  if (
    !email ||
    email.length > NEWSLETTER_EMAIL_MAX_LENGTH ||
    !EMAIL_PATTERN.test(email)
  ) {
    return null
  }

  return email
}

export function parseNewsletterSource(
  value: unknown
): NewsletterSource | undefined {
  if (value === "homepage" || value === "footer" || value === "maintenance") {
    return value
  }
  return undefined
}

export function isHoneypotTriggered(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0
}
