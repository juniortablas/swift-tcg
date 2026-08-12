/**
 * Storefront CMS metaobject type handles that should invalidate
 * the `storefront-cms` Data Cache tag.
 *
 * Used by:
 * - `scripts/setup-cache-webhooks.ts` (Shopify delivery filter)
 * - `app/api/webhooks/cache/route.ts` (runtime type guard)
 *
 * Shopify requires METAOBJECTS_* webhooks to include a `type:…` filter
 * (wildcards like `type:*` are not supported).
 */

import {
  HOMEPAGE_FEATURED_COLLECTION_TYPE,
  HOMEPAGE_FEATURED_PRODUCT_TYPE,
  HOMEPAGE_PROMOTION_TYPE,
  HOMEPAGE_TYPE,
} from "@/lib/shopify/homepageMerchandising"
import {
  STOREFRONT_HERO_TYPE,
  STOREFRONT_VISUAL_TYPE,
} from "@/lib/shopify/storefrontCms"

/** Metaobject definition types that drive homepage / collection CMS. */
export const STOREFRONT_CMS_METAOBJECT_TYPES = [
  STOREFRONT_HERO_TYPE,
  STOREFRONT_VISUAL_TYPE,
  HOMEPAGE_TYPE,
  HOMEPAGE_FEATURED_PRODUCT_TYPE,
  HOMEPAGE_FEATURED_COLLECTION_TYPE,
  HOMEPAGE_PROMOTION_TYPE,
] as const

export type StorefrontCmsMetaobjectType =
  (typeof STOREFRONT_CMS_METAOBJECT_TYPES)[number]

/**
 * Shopify webhook delivery filter for CMS metaobjects.
 * Format: `type:a OR type:b OR …` (required for METAOBJECTS_* topics).
 */
export function storefrontCmsWebhookFilter(): string {
  return STOREFRONT_CMS_METAOBJECT_TYPES.map((type) => `type:${type}`).join(
    " OR "
  )
}

export function isStorefrontCmsMetaobjectType(type: string | null | undefined): boolean {
  const normalized = type?.trim()
  if (!normalized) return false
  return (STOREFRONT_CMS_METAOBJECT_TYPES as readonly string[]).includes(
    normalized
  )
}
