import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import StoreChrome from "@/components/layout/StoreChrome"
import { getCustomerLoginHref } from "@/lib/account/customerLogin"
import {
  isCustomerAccountConfigured,
  isCustomerLoggedIn,
} from "@/lib/shopify/customerAccount"

export const dynamic = "force-dynamic"

export default async function AccountLayout({
  children,
}: {
  children: ReactNode
}) {
  if (!isCustomerAccountConfigured()) {
    return (
      <StoreChrome>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Accounts not configured
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-black/55">
            Add{" "}
            <code className="rounded bg-black/[0.04] px-1.5 py-0.5 text-xs">
              SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID
            </code>
            ,{" "}
            <code className="rounded bg-black/[0.04] px-1.5 py-0.5 text-xs">
              SHOPIFY_SHOP_ID
            </code>
            , and{" "}
            <code className="rounded bg-black/[0.04] px-1.5 py-0.5 text-xs">
              SHOPIFY_APP_URL
            </code>{" "}
            from Headless → Customer Account API, then register the callback URL{" "}
            <code className="rounded bg-black/[0.04] px-1.5 py-0.5 text-xs">
              /account/authorize
            </code>
            .
          </p>
        </div>
      </StoreChrome>
    )
  }

  const loggedIn = await isCustomerLoggedIn()
  if (!loggedIn) {
    redirect(getCustomerLoginHref("/account"))
  }

  return <StoreChrome>{children}</StoreChrome>
}
