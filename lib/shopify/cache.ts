/**
 * Shared Next.js Data Cache defaults for Shopify Storefront reads.
 *
 * Webhooks (`/api/webhooks/cache`) are the primary freshness signal via
 * `revalidateTag`. TTLs below are fallbacks only when webhooks are delayed
 * or unregistered. Cart / customer / wishlist must pass `cache: "no-store"`.
 */

/** Catalog fallback revalidate window (seconds). */
export const SHOPIFY_CATALOG_REVALIDATE = 3600

/** CMS / metaobject fallback revalidate window (seconds). */
export const SHOPIFY_CMS_REVALIDATE = 3600

/** Chrome/social fallback revalidate window (seconds). */
export const SHOPIFY_CHROME_REVALIDATE = 3600

/** Policy fallback revalidate window (seconds). */
export const SHOPIFY_POLICY_REVALIDATE = 3600

export const SHOPIFY_CATALOG_TAGS = ["shopify-catalog"]
export const SHOPIFY_CMS_TAGS = ["storefront-cms"]
export const SHOPIFY_CHROME_TAGS = ["shopify-chrome"]
export const SHOPIFY_POLICY_TAGS = ["shopify-policies"]

export const catalogFetchOptions: {
  next: NextFetchRequestConfig
} = {
  next: {
    revalidate: SHOPIFY_CATALOG_REVALIDATE,
    tags: SHOPIFY_CATALOG_TAGS,
  },
}

export const cmsFetchOptions: {
  next: NextFetchRequestConfig
} = {
  next: {
    revalidate: SHOPIFY_CMS_REVALIDATE,
    tags: SHOPIFY_CMS_TAGS,
  },
}

export const chromeFetchOptions: {
  next: NextFetchRequestConfig
} = {
  next: {
    revalidate: SHOPIFY_CHROME_REVALIDATE,
    tags: SHOPIFY_CHROME_TAGS,
  },
}

export const policyFetchOptions: {
  next: NextFetchRequestConfig
} = {
  next: {
    revalidate: SHOPIFY_POLICY_REVALIDATE,
    tags: [...SHOPIFY_POLICY_TAGS, ...SHOPIFY_CHROME_TAGS],
  },
}
