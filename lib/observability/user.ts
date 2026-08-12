/**
 * Server-only Sentry user context from the Customer Account ID token.
 * Never reads or sends session / access / refresh tokens.
 */

import { createHash } from "node:crypto"

import * as Sentry from "@sentry/nextjs"

import { readCustomerSession } from "@/lib/shopify/customerAccount"

export type SentryUserContext = {
  id: string
  emailHash: string | null
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".")
  if (parts.length < 2 || !parts[1]) return null
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const pad =
      padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
    return JSON.parse(
      Buffer.from(padded + pad, "base64").toString("utf8")
    ) as Record<string, unknown>
  } catch {
    return null
  }
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
}

export async function getSentryUserFromSession(): Promise<SentryUserContext | null> {
  try {
    const session = await readCustomerSession()
    if (!session?.idToken) return null
    const payload = decodeJwtPayload(session.idToken)
    if (!payload) return null
    const id = typeof payload.sub === "string" ? payload.sub.trim() : ""
    if (!id) return null
    const email = typeof payload.email === "string" ? payload.email : null
    return {
      id,
      emailHash: email ? hashEmail(email) : null,
    }
  } catch {
    return null
  }
}

export async function applySentryUserFromSession(): Promise<SentryUserContext | null> {
  const user = await getSentryUserFromSession()
  if (!user) {
    Sentry.setUser(null)
    return null
  }
  Sentry.setUser({
    id: user.id,
    email: user.emailHash ?? undefined,
  })
  return user
}
