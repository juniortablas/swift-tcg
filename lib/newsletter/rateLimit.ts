/**
 * In-memory sliding-window limiter for newsletter POSTs.
 * Per-instance only (Vercel/serverless) — basic abuse protection, not a global quota.
 */

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_IP = 8
const MAX_PER_EMAIL = 4

type Bucket = number[]

const ipHits = new Map<string, Bucket>()
const emailHits = new Map<string, Bucket>()

function prune(bucket: Bucket, now: number): Bucket {
  return bucket.filter((timestamp) => now - timestamp < WINDOW_MS)
}

function recordAndCheck(
  store: Map<string, Bucket>,
  key: string,
  max: number,
  now: number
): boolean {
  const next = prune(store.get(key) ?? [], now)
  if (next.length >= max) {
    store.set(key, next)
    return true
  }
  next.push(now)
  store.set(key, next)
  return false
}

/**
 * Returns true when the IP or email has exceeded the window.
 * Counts this attempt when still under the limit.
 */
export function isNewsletterRateLimited(input: {
  ip: string
  email: string
}): boolean {
  const now = Date.now()
  const ipLimited = recordAndCheck(ipHits, input.ip, MAX_PER_IP, now)
  if (ipLimited) return true
  return recordAndCheck(emailHits, input.email, MAX_PER_EMAIL, now)
}

const recentSuccess = new Map<string, number>()
const RECENT_SUCCESS_TTL_MS = 2 * 60 * 1000

export function wasRecentlySubscribed(email: string): boolean {
  const expiresAt = recentSuccess.get(email)
  if (expiresAt == null) return false
  if (Date.now() > expiresAt) {
    recentSuccess.delete(email)
    return false
  }
  return true
}

export function markNewsletterSubscribed(email: string): void {
  recentSuccess.set(email, Date.now() + RECENT_SUCCESS_TTL_MS)
}
