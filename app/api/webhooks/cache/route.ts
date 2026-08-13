import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

import {
  SHOPIFY_CATALOG_TAGS,
  SHOPIFY_CHROME_TAGS,
  SHOPIFY_CMS_TAGS,
  SHOPIFY_POLICY_TAGS,
} from "@/lib/shopify/cache"
import { WEEKLY_RESTOCK_CACHE_TAG, weeklyRestockProductCacheTag } from "@/lib/shopify/weeklyRestockReservations"
import { syncWeeklyRestockFromWebhook } from "@/lib/shopify/weeklyRestockCounter"
import { isStorefrontCmsMetaobjectType } from "@/lib/shopify/cmsMetaobjectTypes"
import { verifyShopifyWebhookHmac } from "@/lib/shopify/webhookAuth"
import { captureRouteException } from "@/lib/observability/capture"

export const dynamic = "force-dynamic"

/**
 * Shopify webhook → Next.js Data Cache invalidation.
 *
 * Register via `npm run setup:cache-webhooks`.
 *
 * Topics:
 * - products/* / collections/* / inventory_levels/* → shopify-catalog
 * - orders/* / refunds/* → increment/decrement `custom.current_weekly_reservations`
 *   (idempotent via webhook IDs) + catalog revalidation

 * - metaobjects/* (CMS types only; Shopify requires a type: filter at
 *   subscription time; we also guard by type at runtime) → storefront-cms
 * - shop/update → shopify-chrome (+ policies)
 *
 * Auth: HMAC via X-Shopify-Hmac-Sha256
 * (SHOPIFY_WEBHOOK_SECRET or SHOPIFY_CLIENT_SECRET).
 */

type CacheAction = {
  tags: string[]
  /** Soft-invalidate common storefront surfaces. */
  paths?: string[]
}

const TOPIC_ACTIONS: Record<string, CacheAction> = {
  "products/create": { tags: [...SHOPIFY_CATALOG_TAGS], paths: ["/", "/search"] },
  "products/update": { tags: [...SHOPIFY_CATALOG_TAGS], paths: ["/", "/search"] },
  "products/delete": { tags: [...SHOPIFY_CATALOG_TAGS], paths: ["/", "/search"] },
  "collections/create": {
    tags: [...SHOPIFY_CATALOG_TAGS],
    paths: ["/", "/preorders", "/new-releases", "/pokemon", "/one-piece"],
  },
  "collections/update": {
    tags: [...SHOPIFY_CATALOG_TAGS],
    paths: ["/", "/preorders", "/new-releases", "/pokemon", "/one-piece"],
  },
  "collections/delete": {
    tags: [...SHOPIFY_CATALOG_TAGS],
    paths: ["/", "/preorders", "/new-releases", "/pokemon", "/one-piece"],
  },
  "inventory_levels/update": {
    tags: [...SHOPIFY_CATALOG_TAGS],
    paths: ["/"],
  },
  "orders/create": {
    tags: [...SHOPIFY_CATALOG_TAGS, WEEKLY_RESTOCK_CACHE_TAG],
    paths: ["/"],
  },
  "orders/updated": {
    tags: [...SHOPIFY_CATALOG_TAGS, WEEKLY_RESTOCK_CACHE_TAG],
    paths: ["/"],
  },
  "orders/cancelled": {
    tags: [...SHOPIFY_CATALOG_TAGS, WEEKLY_RESTOCK_CACHE_TAG],
    paths: ["/"],
  },
  "refunds/create": {
    tags: [...SHOPIFY_CATALOG_TAGS, WEEKLY_RESTOCK_CACHE_TAG],
    paths: ["/"],
  },
  "metaobjects/create": {
    tags: [...SHOPIFY_CMS_TAGS],
    paths: ["/"],
  },
  "metaobjects/update": {
    tags: [...SHOPIFY_CMS_TAGS],
    paths: ["/"],
  },
  "metaobjects/delete": {
    tags: [...SHOPIFY_CMS_TAGS],
    paths: ["/"],
  },
  "shop/update": {
    tags: [...SHOPIFY_CHROME_TAGS, ...SHOPIFY_POLICY_TAGS],
    paths: ["/"],
  },
}

type ProductPayload = {
  handle?: string | null
  admin_graphql_api_id?: string | null
}

type CollectionPayload = {
  handle?: string | null
}

type MetaobjectPayload = {
  type?: string | null
  handle?: string | null
}

type OrderPayload = {
  line_items?: Array<{ product_id?: number | string | null }>
  refund_line_items?: Array<{
    line_item?: { product_id?: number | string | null }
  }>
}

function normalizeTopic(header: string | null): string {
  return (header ?? "").trim().toLowerCase()
}

function productGidsFromOrderPayload(body: string): string[] {
  try {
    const payload = JSON.parse(body) as OrderPayload
    const ids = new Set<string>()
    for (const line of payload.line_items ?? []) {
      if (line.product_id != null) {
        ids.add(`gid://shopify/Product/${line.product_id}`)
      }
    }
    for (const refund of payload.refund_line_items ?? []) {
      const productId = refund.line_item?.product_id
      if (productId != null) {
        ids.add(`gid://shopify/Product/${productId}`)
      }
    }
    return [...ids]
  } catch {
    return []
  }
}

function extractMetaobjectType(body: string): string | null {
  try {
    const payload = JSON.parse(body) as MetaobjectPayload
    const type = payload.type?.trim()
    return type || null
  } catch {
    return null
  }
}

function revalidate(action: CacheAction, topic: string, body: string) {
  const tags = [...action.tags]
  if (topic.startsWith("orders/") || topic.startsWith("refunds/")) {
    for (const productId of productGidsFromOrderPayload(body)) {
      tags.push(weeklyRestockProductCacheTag(productId))
    }
  }

  const uniqueTags = [...new Set(tags)]
  for (const tag of uniqueTags) {
    // Immediate expire — merchants expect Admin edits to show on next request.
    revalidateTag(tag, { expire: 0 })
  }

  const paths = new Set(action.paths ?? [])

  if (topic.startsWith("products/")) {
    try {
      const payload = JSON.parse(body) as ProductPayload
      const handle = payload.handle?.trim()
      if (handle) paths.add(`/products/${handle}`)
    } catch {
      // Ignore malformed product payloads — tags still invalidate catalog.
    }
  }

  if (topic.startsWith("collections/")) {
    try {
      const payload = JSON.parse(body) as CollectionPayload
      const handle = payload.handle?.trim()
      if (handle) {
        if (handle === "new-arrivals") paths.add("/new-releases")
        else paths.add(`/${handle}`)
      }
    } catch {
      // Ignore.
    }
  }

  for (const path of paths) {
    revalidatePath(path)
  }

  return { tags: uniqueTags, paths: [...paths] }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const hmac = request.headers.get("x-shopify-hmac-sha256")

  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ ok: false, error: "invalid_hmac" }, { status: 401 })
  }

  const topic = normalizeTopic(request.headers.get("x-shopify-topic"))
  const action = TOPIC_ACTIONS[topic]

  if (!action) {
    return NextResponse.json({ ok: true, skipped: true, topic })
  }

  // Defense in depth: Shopify already filters METAOBJECTS_* by type at
  // delivery time, but skip unexpected types (e.g. reviews) if they arrive.
  if (topic.startsWith("metaobjects/")) {
    const type = extractMetaobjectType(rawBody)
    if (!isStorefrontCmsMetaobjectType(type)) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        topic,
        reason: "non_cms_metaobject",
        type,
      })
    }
  }

  try {
    if (topic.startsWith("orders/") || topic.startsWith("refunds/")) {
      const webhookId =
        request.headers.get("x-shopify-webhook-id")?.trim() ||
        request.headers.get("x-shopify-event-id")?.trim() ||
        ""
      await syncWeeklyRestockFromWebhook({
        topic,
        webhookId,
        body: rawBody,
      })
    }

    const result = revalidate(action, topic, rawBody)
    return NextResponse.json({ ok: true, topic, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "revalidate_failed"
    console.error("[cache webhook]", topic, message)
    captureRouteException(error, { route: "/api/webhooks/cache", status: 500 })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
