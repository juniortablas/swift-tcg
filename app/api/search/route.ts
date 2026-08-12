import { NextResponse } from "next/server"

import { runPredictiveSearch } from "@/lib/shopify/predictiveSearch"
import type { PredictiveSearchPayload } from "@/lib/shopify/predictiveSearchTypes"

export const dynamic = "force-dynamic"

const EMPTY: PredictiveSearchPayload = {
  products: [],
  collections: [],
  pages: [],
  queries: [],
  source: "predictive",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "8", 10)
  // Predictive Search API caps limit at 10 per type when limitScope=EACH.
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 10)
    : 8

  if (q.length < 2) {
    return NextResponse.json(EMPTY, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    })
  }

  const payload = await runPredictiveSearch(q, limit)

  return NextResponse.json(payload, {
    headers: {
      // Short private cache — browser / CDN edge can reuse identical queries.
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  })
}
