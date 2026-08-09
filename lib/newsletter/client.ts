import type {
  NewsletterSubscribeResult,
  NewsletterSource,
} from "@/lib/newsletter/types"

export type NewsletterApiResponse = NewsletterSubscribeResult & {
  ok: boolean
}

/**
 * Browser helper for newsletter forms. Hits the App Router API so ESP
 * credentials never leave the server.
 */
export async function subscribeNewsletterClient(input: {
  email: string
  source?: NewsletterSource
}): Promise<NewsletterApiResponse> {
  try {
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        source: input.source,
      }),
    })

    const payload = (await res.json()) as NewsletterSubscribeResult

    return {
      ok: res.ok && isSuccessStatus(payload.status),
      status: payload.status,
      message: payload.message,
    }
  } catch {
    return {
      ok: false,
      status: "error",
      message: "Something went wrong. Please try again.",
    }
  }
}

function isSuccessStatus(
  status: NewsletterSubscribeResult["status"]
): boolean {
  return status === "subscribed" || status === "already_subscribed"
}
