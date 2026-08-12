import { NextResponse } from "next/server"

import { processBackInStockAlerts } from "@/lib/back-in-stock/process"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false

  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true

  const headerSecret = request.headers.get("x-cron-secret")
  return headerSecret === secret
}

/**
 * Vercel Cron (or manual) entrypoint for back-in-stock emails.
 * Secure with CRON_SECRET — Vercel sends Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processBackInStockAlerts()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Back-in-stock cron failed."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
