import { NextResponse } from "next/server"

import {
  REVIEW_FIELD,
  REVIEW_METAOBJECT_TYPE,
  REVIEW_STATUS,
  isProductGid,
} from "@/lib/reviews/constants"
import { syncProductReviewAggregates } from "@/lib/reviews/server"
import { shopifyAdminFetch } from "@/lib/shopify/admin"

export const dynamic = "force-dynamic"

/**
 * Periodic aggregate sync for products with pending/approved review changes
 * that may have been moderated in Admin without a webhook.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (same as back-in-stock cron).
 */

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return process.env.NODE_ENV !== "production"
  const header = request.headers.get("authorization")
  return header === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const data = await shopifyAdminFetch<{
    metaobjects: {
      nodes: Array<{
        fields: Array<{ key: string; value: string | null }>
      }>
    }
  }>({
    query: /* GraphQL */ `
      query RecentReviews($type: String!) {
        metaobjects(type: $type, first: 50, reverse: true, sortKey: UPDATED_AT) {
          nodes {
            fields {
              key
              value
            }
          }
        }
      }
    `,
    variables: { type: REVIEW_METAOBJECT_TYPE },
  })

  const productIds = new Set<string>()
  for (const node of data.metaobjects.nodes) {
    const productId = node.fields.find((f) => f.key === REVIEW_FIELD.productId)
      ?.value
    const status = node.fields.find((f) => f.key === REVIEW_FIELD.status)?.value
    if (
      productId &&
      isProductGid(productId) &&
      (status === REVIEW_STATUS.approved ||
        status === REVIEW_STATUS.rejected ||
        status === REVIEW_STATUS.pending)
    ) {
      productIds.add(productId)
    }
  }

  const results: Array<{ productId: string; count: number }> = []
  for (const productId of productIds) {
    const summary = await syncProductReviewAggregates(productId)
    results.push({ productId, count: summary.count })
  }

  return NextResponse.json({
    ok: true,
    synced: results.length,
    results,
  })
}
