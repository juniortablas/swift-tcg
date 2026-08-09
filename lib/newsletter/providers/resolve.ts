import { createKlaviyoProvider } from "@/lib/newsletter/providers/klaviyo"
import { createShopifyEmailProvider } from "@/lib/newsletter/providers/shopify"
import type { NewsletterProvider } from "@/lib/newsletter/providers/types"
import { unconfiguredProvider } from "@/lib/newsletter/providers/unconfigured"
import type { NewsletterProviderId } from "@/lib/newsletter/types"

/**
 * Resolve the active newsletter ESP from env.
 *
 * Set `NEWSLETTER_PROVIDER` to `klaviyo` or `shopify` and fill provider
 * credentials. Until each adapter's `subscribe` is implemented, results stay
 * `provider_not_configured` (never fake success).
 */
export function resolveNewsletterProvider(): NewsletterProvider {
  const raw = process.env.NEWSLETTER_PROVIDER?.trim().toLowerCase()
  const id = normalizeProviderId(raw)

  switch (id) {
    case "klaviyo": {
      const apiKey = process.env.KLAVIYO_API_KEY?.trim()
      const listId = process.env.KLAVIYO_LIST_ID?.trim()
      if (!apiKey || !listId) return unconfiguredProvider
      return createKlaviyoProvider({ apiKey, listId })
    }
    case "shopify": {
      const shopDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim()
      if (!shopDomain) return unconfiguredProvider
      return createShopifyEmailProvider({ shopDomain })
    }
    case "none":
    default:
      return unconfiguredProvider
  }
}

function normalizeProviderId(
  value: string | undefined
): NewsletterProviderId {
  if (value === "klaviyo" || value === "shopify" || value === "none") {
    return value
  }
  return "none"
}
