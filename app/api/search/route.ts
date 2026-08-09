import { NextResponse } from "next/server"

import { searchShopifyProducts } from "@/lib/shopify/search"
import type { Product } from "@/types/product"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "12", 10)
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 24)
    : 12

  if (!q) {
    return NextResponse.json({ products: [] satisfies Product[] })
  }

  const products = await searchShopifyProducts(q, limit)
  return NextResponse.json({ products })
}
