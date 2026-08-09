/**
 * PKCE + OAuth helpers for Shopify Customer Account API.
 */

import { createHash, randomBytes } from "node:crypto"

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

export function generateRandomString(byteLength = 32): string {
  return base64Url(randomBytes(byteLength))
}

export function generateCodeVerifier(): string {
  return generateRandomString(32)
}

export function generateCodeChallenge(verifier: string): string {
  return base64Url(createHash("sha256").update(verifier).digest())
}

export function generateNonce(): string {
  return generateRandomString(16)
}

export function generateState(): string {
  return generateRandomString(16)
}

export type PkceAuthState = {
  state: string
  nonce: string
  codeVerifier: string
  returnTo: string
}

/** Default scopes for full Customer Account API access. */
export const CUSTOMER_ACCOUNT_SCOPES =
  "openid email customer-account-api:full"
