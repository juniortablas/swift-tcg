import type { NewsletterSubscribeResult, NewsletterSource } from "./types"
import {
  NEWSLETTER_ERROR_MESSAGE,
  NEWSLETTER_HONEYPOT_FIELD,
} from "./constants"

export type NewsletterApiResponse = NewsletterSubscribeResult

/**
 * Browser helper for newsletter forms. Hits the App Router API so Admin
 * credentials never leave the server.
 */
export async function subscribeNewsletterClient(input: {
  email: string
  source?: NewsletterSource
  website?: string
}): Promise<NewsletterApiResponse> {
  try {
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        source: input.source,
        [NEWSLETTER_HONEYPOT_FIELD]: input.website ?? "",
      }),
    })

    const payload = (await res.json()) as Partial<NewsletterSubscribeResult>

    if (typeof payload.success === "boolean" && typeof payload.message === "string") {
      return { success: payload.success, message: payload.message }
    }

    return {
      success: false,
      message: NEWSLETTER_ERROR_MESSAGE,
    }
  } catch {
    return {
      success: false,
      message: NEWSLETTER_ERROR_MESSAGE,
    }
  }
}
