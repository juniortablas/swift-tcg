import { resolveNewsletterProvider } from "@/lib/newsletter/providers/resolve"
import type {
  NewsletterSubscribeInput,
  NewsletterSubscribeResult,
  NewsletterSource,
} from "@/lib/newsletter/types"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Server-side newsletter subscribe entrypoint.
 * Components must call this via `/api/newsletter` — never from the browser.
 */
export async function subscribeToNewsletter(
  input: NewsletterSubscribeInput
): Promise<NewsletterSubscribeResult> {
  const email = input.email.trim().toLowerCase()
  const source = normalizeSource(input.source)

  if (!email || !EMAIL_PATTERN.test(email)) {
    return {
      status: "invalid_email",
      message: "Enter a valid email address.",
    }
  }

  const provider = resolveNewsletterProvider()
  return provider.subscribe({ email, source })
}

function normalizeSource(
  source: NewsletterSource | undefined
): NewsletterSource {
  if (source === "homepage" || source === "footer") return source
  return "unknown"
}
