import type {
  NewsletterProviderId,
  NewsletterSubscribeInput,
  NewsletterSubscribeResult,
} from "@/lib/newsletter/types"

/**
 * Email service provider adapter.
 * Implement this for Klaviyo, Shopify Email, etc., then register in `resolve.ts`.
 */
export interface NewsletterProvider {
  readonly id: NewsletterProviderId
  subscribe(
    input: NewsletterSubscribeInput
  ): Promise<NewsletterSubscribeResult>
}
