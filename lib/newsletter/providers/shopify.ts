import type { NewsletterProvider } from "@/lib/newsletter/providers/types"
import { providerNotConfiguredResult } from "@/lib/newsletter/providers/unconfigured"
import type { NewsletterSubscribeInput } from "@/lib/newsletter/types"

export type ShopifyEmailProviderConfig = {
  /** Reserved for Admin / customer marketing credentials when wired. */
  shopDomain: string
}

/**
 * Shopify Email / customer marketing adapter scaffold.
 * Implement `subscribe` via Admin customer create + email marketing consent
 * (or a Shopify Email integration), then return this from
 * `resolveNewsletterProvider` when `NEWSLETTER_PROVIDER=shopify`.
 */
export function createShopifyEmailProvider(
  _config: ShopifyEmailProviderConfig
): NewsletterProvider {
  return {
    id: "shopify",
    async subscribe(_input: NewsletterSubscribeInput) {
      // TODO: create/update customer with email marketing consent
      return providerNotConfiguredResult()
    },
  }
}
