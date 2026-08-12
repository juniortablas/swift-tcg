import * as Sentry from "@sentry/nextjs"

/**
 * Capture handled route failures without changing the HTTP response.
 * Skips expected 4xx (auth, validation). 5xx and Shopify 502s are reported.
 */
export function captureRouteException(
  error: unknown,
  context: { route: string; status?: number }
): void {
  if (typeof context.status === "number" && context.status < 500) return
  Sentry.captureException(error, {
    tags: { route: context.route },
  })
}
