import * as Sentry from "@sentry/nextjs"

import { getSentryDsn } from "./lib/observability/config"

export async function register() {
  if (!getSentryDsn()) return

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export async function onRequestError(
  ...args: Parameters<typeof Sentry.captureRequestError>
) {
  if (!getSentryDsn()) return

  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { applySentryUserFromSession } = await import(
        "./lib/observability/user"
      )
      await applySentryUserFromSession()
    } catch {
      // Request cookies may be unavailable; still capture the error.
    }
  }

  Sentry.captureRequestError(...args)
}
