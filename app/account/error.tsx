"use client"

import { useEffect } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getCustomerLoginHref } from "@/lib/account/customerLogin"

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const unauthorized = /not signed in|unauthorized|401/i.test(error.message)

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-black">
        {unauthorized ? "Session expired" : "Something went wrong"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-black/55">
        {unauthorized
          ? "Sign in again with Shopify Customer Accounts to continue."
          : error.message || "Unable to load your account."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {unauthorized ? (
          <Button render={<Link href={getCustomerLoginHref("/account")} />}>
            Sign in
          </Button>
        ) : (
          <Button onClick={reset}>Try again</Button>
        )}
        <Button variant="ghost" render={<Link href="/" />}>
          Back to store
        </Button>
      </div>
    </div>
  )
}
