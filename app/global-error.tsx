"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

import ErrorRecovery from "@/components/ux/ErrorRecovery"
import "./globals.css"

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-full font-sans antialiased">
        <title>Something went wrong | Swift TCG</title>
        <ErrorRecovery
          fullPage
          onRetry={recover}
          title="Something went wrong"
          description="Swift TCG hit an unexpected error. Please try again. If it keeps happening, contact support and we'll help."
        />
      </body>
    </html>
  )
}
