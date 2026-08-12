/**
 * Strip secrets, tokens, cookies, and payment fields from Sentry payloads.
 */

const REDACTED = "[Filtered]"

const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|password|passwd|secret|token|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|client[_-]?secret|private[_-]?token|credit[_-]?card|card[_-]?number|cvv|cvc|pan|iban|session|x-shopify.*|shopify[_-]?(storefront)?[_-]?(private[_-]?)?token|x-cron-secret|cron[_-]?secret)$/i

const SENSITIVE_VALUE =
  /\b(?:shpat_|shpca_|shpss_|shunf_)[A-Za-z0-9]+\b|\bBearer\s+\S+\b|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-shopify-access-token",
  "x-shopify-storefront-access-token",
  "x-shopify-storefront-private-token",
  "x-shopify-hmac-sha256",
  "x-cron-secret",
])

function redactString(value: string): string {
  return value.replace(SENSITIVE_VALUE, REDACTED)
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key)
}

function redactUnknown(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return redactString(value)
  if (typeof value !== "object" || value === null) return value
  if (seen.has(value)) return REDACTED
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => redactUnknown(item, seen))
  }

  const record = value as Record<string, unknown>
  const next: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(record)) {
    if (isSensitiveKey(key)) {
      next[key] = REDACTED
      continue
    }
    next[key] = redactUnknown(nested, seen)
  }
  return next
}

function scrubHeaders(
  headers: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!headers) return headers
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase()) || isSensitiveKey(key)) {
      next[key] = REDACTED
      continue
    }
    next[key] = typeof value === "string" ? redactString(value) : value
  }
  return next
}

type SentryLikeEvent = {
  message?: string
  user?: {
    ip_address?: string | null
    email?: string | null
    [key: string]: unknown
  } | null
  request?: {
    cookies?: unknown
    headers?: Record<string, unknown>
    data?: unknown
    query_string?: unknown
    [key: string]: unknown
  }
  extra?: Record<string, unknown>
  contexts?: Record<string, unknown>
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }> | {
    values?: Array<{ message?: string; data?: Record<string, unknown> }>
  }
  [key: string]: unknown
}

export function sanitizeSentryEvent<T extends object>(event: T): T {
  const target = event as T & SentryLikeEvent
  const seen = new WeakSet<object>()

  if (target.message) target.message = redactString(target.message)

  if (target.user) {
    delete target.user.ip_address
    if (typeof target.user.email === "string" && target.user.email.includes("@")) {
      target.user.email = REDACTED
    }
  }

  if (target.request) {
    delete target.request.cookies
    target.request.headers = scrubHeaders(target.request.headers)
    if (target.request.data !== undefined) {
      target.request.data = redactUnknown(target.request.data, seen)
    }
    if (typeof target.request.query_string === "string") {
      target.request.query_string = redactString(target.request.query_string)
    }
  }

  if (target.extra) {
    target.extra = redactUnknown(target.extra, seen) as Record<string, unknown>
  }

  if (target.contexts) {
    target.contexts = redactUnknown(target.contexts, seen) as Record<
      string,
      unknown
    >
  }

  const crumbs = Array.isArray(target.breadcrumbs)
    ? target.breadcrumbs
    : target.breadcrumbs?.values
  if (crumbs) {
    for (const crumb of crumbs) {
      if (crumb.message) crumb.message = redactString(crumb.message)
      if (crumb.data) {
        crumb.data = redactUnknown(crumb.data, seen) as Record<string, unknown>
      }
    }
  }

  return event
}
