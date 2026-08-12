import type { DataCollection, ErrorEvent } from "@sentry/core"

import {
  getSentryDsn,
  getSentryEnvironment,
  getSentryReleaseName,
  getTracesSampleRate,
} from "./config"
import { sanitizeSentryEvent } from "./sanitize"

/** Opt out of automatic PII. Explicit `setUser()` values are still sent. */
export const SENTRY_DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpBodies: [],
  httpHeaders: {
    request: false,
    response: false,
  },
  urlQueryParams: {
    deny: ["token", "access_token", "refresh_token", "id_token", "code", "password"],
  },
  genAI: { inputs: false, outputs: false },
  stackFrameVariables: false,
}

export const SENTRY_IGNORE_ERRORS = [
  /^AbortError/i,
  /The operation was aborted/i,
  /ResizeObserver loop/i,
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
]

export const SENTRY_DENY_URLS = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
]

export function sanitizeBeforeSend(event: ErrorEvent): ErrorEvent | null {
  sanitizeSentryEvent(event)
  return event
}

export function getSharedSentryOptions() {
  return {
    dsn: getSentryDsn(),
    environment: getSentryEnvironment(),
    release: getSentryReleaseName(),
    tracesSampleRate: getTracesSampleRate(),
    dataCollection: SENTRY_DATA_COLLECTION,
    beforeSend: sanitizeBeforeSend,
    beforeSendTransaction: sanitizeSentryEvent,
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    denyUrls: SENTRY_DENY_URLS,
    maxBreadcrumbs: 50,
  }
}
