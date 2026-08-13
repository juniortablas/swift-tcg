import { subscribeShopifyNewsletterCustomer } from "@/lib/shopify/newsletter"
import { ShopifyClientError } from "@/lib/shopify/client"

import {
  isHoneypotTriggered,
  NEWSLETTER_INVALID_EMAIL_MESSAGE,
  NEWSLETTER_RATE_LIMIT_MESSAGE,
  NEWSLETTER_SUCCESS_MESSAGE,
  sanitizeNewsletterEmail,
} from "./constants"
import {
  isNewsletterRateLimited,
  markNewsletterSubscribed,
  wasRecentlySubscribed,
} from "./rateLimit"
import type {
  NewsletterSubscribeInput,
  NewsletterSubscribeOutcome,
} from "./types"

/**
 * Server-side newsletter subscribe entrypoint.
 * Components must call this via `/api/newsletter` — never from the browser.
 */
export async function subscribeToNewsletter(
  input: NewsletterSubscribeInput & { ip?: string }
): Promise<NewsletterSubscribeOutcome> {
  if (isHoneypotTriggered(input.website)) {
    return { ok: true, message: NEWSLETTER_SUCCESS_MESSAGE }
  }

  const email = sanitizeNewsletterEmail(input.email)
  if (!email) {
    return {
      ok: false,
      reason: "invalid_email",
      message: NEWSLETTER_INVALID_EMAIL_MESSAGE,
    }
  }

  if (wasRecentlySubscribed(email)) {
    return { ok: true, message: NEWSLETTER_SUCCESS_MESSAGE }
  }

  if (
    isNewsletterRateLimited({
      ip: input.ip?.trim() || "unknown",
      email,
    })
  ) {
    return {
      ok: false,
      reason: "rate_limited",
      message: NEWSLETTER_RATE_LIMIT_MESSAGE,
    }
  }

  try {
    await subscribeShopifyNewsletterCustomer(email)
    markNewsletterSubscribed(email)
    return { ok: true, message: NEWSLETTER_SUCCESS_MESSAGE }
  } catch (error) {
    if (error instanceof ShopifyClientError && error.status === 400) {
      return {
        ok: false,
        reason: "invalid_email",
        message: NEWSLETTER_INVALID_EMAIL_MESSAGE,
      }
    }

    console.error("[newsletter] unexpected subscribe failure", error)
    throw error
  }
}
