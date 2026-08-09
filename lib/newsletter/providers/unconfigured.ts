import type { NewsletterProvider } from "@/lib/newsletter/providers/types"
import type { NewsletterSubscribeResult } from "@/lib/newsletter/types"

export const PROVIDER_NOT_CONFIGURED_MESSAGE =
  "Newsletter signup isn't available yet — check back soon."

export function providerNotConfiguredResult(): NewsletterSubscribeResult {
  return {
    status: "provider_not_configured",
    message: PROVIDER_NOT_CONFIGURED_MESSAGE,
  }
}

/**
 * Default provider until Klaviyo or Shopify Email is wired.
 * Always returns a graceful not-configured result (never fake success).
 */
export const unconfiguredProvider: NewsletterProvider = {
  id: "none",
  async subscribe() {
    return providerNotConfiguredResult()
  },
}
