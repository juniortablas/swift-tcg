/**
 * Shared Sentry environment helpers.
 * Safe for client, server, edge, and next.config.ts (no Node-only APIs).
 */

export const APP_NAME = "swift-tcg"
export const APP_VERSION = "0.1.0"

/** Ad-blocker tunnel. Must stay excluded from proxy + maintenance. */
export const SENTRY_TUNNEL_ROUTE = "/monitoring"

export type SentryEnvironment = "development" | "preview" | "production"

export function getSentryDsn(): string | undefined {
  const dsn =
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    process.env.SENTRY_DSN?.trim()
  return dsn || undefined
}

export function isSentryEnabled(): boolean {
  return Boolean(getSentryDsn())
}

export function getSentryEnvironment(): SentryEnvironment {
  const explicit =
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
    process.env.SENTRY_ENVIRONMENT?.trim()
  if (explicit === "production" || explicit === "preview" || explicit === "development") {
    return explicit
  }

  const vercel =
    process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
    process.env.VERCEL_ENV?.trim()
  if (vercel === "production" || vercel === "preview" || vercel === "development") {
    return vercel
  }

  return process.env.NODE_ENV === "production" ? "production" : "development"
}

export function getGitCommitSha(): string | undefined {
  const sha =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim()
  return sha || undefined
}

/**
 * Release id: app@version+sha when a commit is available.
 * Keep this in sync with `withSentryConfig({ release.name })`.
 */
export function getSentryReleaseName(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim() ||
    process.env.SENTRY_RELEASE?.trim()
  if (explicit) return explicit

  const sha = getGitCommitSha()
  if (sha) return `${APP_NAME}@${APP_VERSION}+${sha}`
  return `${APP_NAME}@${APP_VERSION}`
}

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > 1) return fallback
  return value
}

export function getTracesSampleRate(): number {
  const environment = getSentryEnvironment()
  const fallback =
    environment === "development" ? 1 : environment === "preview" ? 0.2 : 0.1
  return parseSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ||
      process.env.SENTRY_TRACES_SAMPLE_RATE,
    fallback
  )
}

export function getReplaysSessionSampleRate(): number {
  return parseSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    0.05
  )
}

export function getReplaysOnErrorSampleRate(): number {
  return parseSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    1
  )
}
