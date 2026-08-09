import type { NewsletterProvider } from "@/lib/newsletter/providers/types"
import { providerNotConfiguredResult } from "@/lib/newsletter/providers/unconfigured"
import type { NewsletterSubscribeInput } from "@/lib/newsletter/types"

export type KlaviyoProviderConfig = {
  apiKey: string
  listId: string
}

/**
 * Klaviyo adapter scaffold.
 * Implement `subscribe` with the Profiles / subscription APIs, then return
 * this from `resolveNewsletterProvider` when `NEWSLETTER_PROVIDER=klaviyo`.
 */
export function createKlaviyoProvider(
  _config: KlaviyoProviderConfig
): NewsletterProvider {
  return {
    id: "klaviyo",
    async subscribe(_input: NewsletterSubscribeInput) {
      // TODO: call Klaviyo subscription API with _config.apiKey / listId
      return providerNotConfiguredResult()
    },
  }
}
