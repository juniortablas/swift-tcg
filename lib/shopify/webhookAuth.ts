/**
 * Shared Shopify webhook HMAC verification.
 */

import { createHmac, timingSafeEqual } from "node:crypto"

export function getShopifyWebhookSecret(): string | null {
  return (
    process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ||
    process.env.SHOPIFY_CLIENT_SECRET?.trim() ||
    null
  )
}

export function verifyShopifyWebhookHmac(
  rawBody: string,
  hmacHeader: string | null
): boolean {
  const secret = getShopifyWebhookSecret()
  if (!secret || !hmacHeader) return false
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64")
  try {
    const a = Buffer.from(digest)
    const b = Buffer.from(hmacHeader)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
