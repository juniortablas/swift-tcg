"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

import ErrorRecovery from "@/components/ux/ErrorRecovery"
import { getCustomerLoginHref } from "@/lib/account/customerLogin"

export default function AccountError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string }
  retry?: () => void
  reset?: () => void
}) {
  const unauthorized = /not signed in|unauthorized|401/i.test(error.message)
  const recover = retry ?? reset

  useEffect(() => {
    console.error(error)
    if (!unauthorized) {
      Sentry.captureException(error)
    }
  }, [error, unauthorized])

  if (unauthorized) {
    return (
      <ErrorRecovery
        title="Session expired"
        description="Sign in again with Shopify Customer Accounts to continue managing your orders, wishlist, and alerts."
        showHome
        showSupport={false}
        secondaryHref={getCustomerLoginHref("/account")}
        secondaryLabel="Sign in"
      />
    )
  }

  return (
    <ErrorRecovery
      title="Unable to load your account"
      description="Please try again. If the problem continues, contact support and we'll help you get back in."
      onRetry={recover}
      showHome
      showSupport
    />
  )
}
