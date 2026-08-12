import { NextResponse } from "next/server"

import {
  REVIEW_FIELD,
  REVIEW_METAOBJECT_TYPE,
  isProductGid,
} from "@/lib/reviews/constants"
import { syncProductReviewAggregates } from "@/lib/reviews/server"
import { verifyShopifyWebhookHmac } from "@/lib/shopify/webhookAuth"
import { captureRouteException } from "@/lib/observability/capture"

export const dynamic = "force-dynamic"

/**
 * Shopify metaobject webhook → recompute product review aggregates.
 *
 * Register via `npm run setup:reviews` (webhookSubscriptionCreate). Do not
 * create these manually in Admin.
 *
 * Auth: HMAC via X-Shopify-Hmac-Sha256 using SHOPIFY_CLIENT_SECRET
 * (or SHOPIFY_WEBHOOK_SECRET if set).
 */

type WebhookPayload = {
  type?: string
  id?: string | number
  handle?: string
  fields?: Array<{ key?: string; value?: string | null }>
}

function extractProductId(payload: WebhookPayload): string | null {
  const fields = payload.fields ?? []
  for (const field of fields) {
    if (field.key === REVIEW_FIELD.productId && field.value && isProductGid(field.value)) {
      return field.value
    }
    if (field.key === REVIEW_FIELD.product && field.value && isProductGid(field.value)) {
      return field.value
    }
  }
  return null
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const hmac = request.headers.get("x-shopify-hmac-sha256")

  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ ok: false, error: "invalid_hmac" }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 })
  }

  if (payload.type && payload.type !== REVIEW_METAOBJECT_TYPE) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const productId = extractProductId(payload)
  if (!productId) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_product" })
  }

  try {
    const summary = await syncProductReviewAggregates(productId)
    return NextResponse.json({ ok: true, productId, summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed"
    console.error("[reviews webhook]", message)
    captureRouteException(error, { route: "/api/webhooks/reviews", status: 500 })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
