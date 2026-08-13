import { NextResponse } from "next/server"

import { subscribeToNewsletter } from "@/lib/newsletter/subscribe"
import {
  NEWSLETTER_ERROR_MESSAGE,
  NEWSLETTER_INVALID_EMAIL_MESSAGE,
  parseNewsletterSource,
} from "@/lib/newsletter/constants"
import type { NewsletterSubscribeResult } from "@/lib/newsletter/types"
import { captureRouteException } from "@/lib/observability/capture"

export const dynamic = "force-dynamic"

type NewsletterBody = {
  email?: unknown
  source?: unknown
  website?: unknown
}

export async function POST(request: Request) {
  let body: NewsletterBody

  try {
    body = (await request.json()) as NewsletterBody
  } catch {
    return jsonResult(
      { success: false, message: NEWSLETTER_INVALID_EMAIL_MESSAGE },
      400
    )
  }

  try {
    const result = await subscribeToNewsletter({
      email: typeof body.email === "string" ? body.email : "",
      source: parseNewsletterSource(body.source),
      website: typeof body.website === "string" ? body.website : "",
      ip: clientIpFromRequest(request),
    })

    if (result.ok) {
      return jsonResult({ success: true, message: result.message }, 200)
    }

    const status =
      result.reason === "invalid_email"
        ? 400
        : result.reason === "rate_limited"
          ? 429
          : 500

    return jsonResult({ success: false, message: result.message }, status)
  } catch (error) {
    captureRouteException(error, { route: "/api/newsletter", status: 500 })
    return jsonResult(
      { success: false, message: NEWSLETTER_ERROR_MESSAGE },
      500
    )
  }
}

function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown"
}

function jsonResult(result: NewsletterSubscribeResult, status: number) {
  return NextResponse.json(result, { status })
}
