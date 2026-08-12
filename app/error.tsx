"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

import ErrorRecovery from "@/components/ux/ErrorRecovery"

export default function Error({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string }
  retry?: () => void
  reset?: () => void
}) {
  useEffect(() => {
    console.error(error)
    Sentry.captureException(error)
  }, [error])

  const recover = retry ?? reset

  return (
    <ErrorRecovery
      fullPage
      onRetry={recover}
      title="Something went wrong"
      description="We couldn't finish loading this page. Try again, or continue shopping from the homepage."
    />
  )
}
