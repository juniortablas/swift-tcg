/**
 * Shopify GraphQL throttle detection and retry.
 *
 * Storefront often returns HTTP 200 with `errors: [{ message: "Throttled" }]`.
 * Admin may return HTTP 429. Both must retry with backoff and never surface
 * as an uncaught 502.
 */

export const SHOPIFY_THROTTLE_ATTEMPTS = 3
const BACKOFF_MS = [250, 500, 1000] as const

type GraphQLErrorLike = {
  message?: string
  extensions?: { code?: string | null } | null
}

export function isShopifyThrottledMessage(value: string): boolean {
  return /throttled/i.test(value)
}

export function isShopifyThrottledGraphQLErrors(
  errors: Array<GraphQLErrorLike> | null | undefined
): boolean {
  return (
    errors?.some((error) => {
      if (error.extensions?.code?.toUpperCase() === "THROTTLED") return true
      return typeof error.message === "string"
        ? isShopifyThrottledMessage(error.message)
        : false
    }) === true
  )
}

export function isShopifyThrottledHttpStatus(status: number | undefined): boolean {
  return status === 429
}

export function isShopifyThrottledError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const status = "status" in error ? error.status : undefined
  if (typeof status === "number" && isShopifyThrottledHttpStatus(status)) {
    return true
  }
  if (error instanceof Error && isShopifyThrottledMessage(error.message)) {
    return true
  }
  if (
    "errors" in error &&
    Array.isArray(error.errors) &&
    isShopifyThrottledGraphQLErrors(error.errors as GraphQLErrorLike[])
  ) {
    return true
  }
  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Retry a Shopify GraphQL call on throttle. Safe for reads and for mutations
 * that Shopify rejects before execution (Throttled / 429).
 */
export async function withShopifyThrottleRetry<T>(
  operation: () => Promise<T>
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < SHOPIFY_THROTTLE_ATTEMPTS; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const retriesLeft = attempt < SHOPIFY_THROTTLE_ATTEMPTS - 1
      if (!retriesLeft || !isShopifyThrottledError(error)) {
        throw error
      }
      await sleep(BACKOFF_MS[attempt] ?? 1000)
    }
  }
  throw lastError
}
