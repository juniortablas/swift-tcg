import { NextResponse } from "next/server"

import {
  beginCustomerLogout,
  readCustomerSession,
} from "@/lib/shopify/customerAccount"
import { clearCustomerSession } from "@/lib/shopify/customerAccount/session"

export const dynamic = "force-dynamic"

async function logout(request: Request) {
  const session = await readCustomerSession()
  if (!session?.idToken) {
    await clearCustomerSession()
    return NextResponse.redirect(new URL("/", request.url))
  }

  const logoutUrl = await beginCustomerLogout(session.idToken)
  return NextResponse.redirect(logoutUrl)
}

/** End Shopify Customer Accounts session. */
export async function GET(request: Request) {
  return logout(request)
}

export async function POST(request: Request) {
  return logout(request)
}
