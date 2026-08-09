import { NextResponse } from "next/server"

import { subscribeToNewsletter } from "@/lib/newsletter"
import type {
  NewsletterSource,
  NewsletterSubscribeResult,
} from "@/lib/newsletter"

export const dynamic = "force-dynamic"

type NewsletterBody = {
  email?: unknown
  source?: unknown
}

export async function POST(request: Request) {
  let body: NewsletterBody

  try {
    body = (await request.json()) as NewsletterBody
  } catch {
    return jsonResult(
      {
        status: "invalid_email",
        message: "Enter a valid email address.",
      },
      400
    )
  }

  const email = typeof body.email === "string" ? body.email : ""
  const source = parseSource(body.source)

  const result = await subscribeToNewsletter({ email, source })
  return jsonResult(result, statusCodeFor(result.status))
}

function parseSource(value: unknown): NewsletterSource | undefined {
  if (value === "homepage" || value === "footer" || value === "unknown") {
    return value
  }
  return undefined
}

function statusCodeFor(
  status: NewsletterSubscribeResult["status"]
): number {
  switch (status) {
    case "subscribed":
    case "already_subscribed":
      return 200
    case "provider_not_configured":
      return 503
    case "invalid_email":
      return 400
    case "error":
    default:
      return 500
  }
}

function jsonResult(result: NewsletterSubscribeResult, status: number) {
  return NextResponse.json(result, { status })
}
