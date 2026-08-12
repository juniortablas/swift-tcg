/**
 * Shopify informational content loaders (pages, policies, shop contact/social).
 *
 * Maps Storefront responses into `@/types/content` for the storefront UI.
 */

import type {
  ContactDetails,
  ContentPage,
  ShopContentSettings,
  ShopPolicy,
  ShopPolicyKind,
  SocialLink,
  SocialPlatform,
} from "@/types/content"

import { cache } from "react"

import { ShopifyClientError, shopifyFetch } from "./client"
import { GET_PAGE_BY_HANDLE, GET_SHOP_CONTENT } from "./queries"
import { sanitizeShopifyHtml } from "./sanitizeHtml"
import type {
  PageByHandleQueryResult,
  ShopifyContentMetafields,
  ShopifyShopPolicy,
  ShopContentQueryResult,
} from "./types"

const SOCIAL_FIELDS: Array<{
  key: keyof ShopifyContentMetafields
  platform: SocialPlatform
  label: string
}> = [
  { key: "instagramUrl", platform: "instagram", label: "Instagram" },
  { key: "xUrl", platform: "x", label: "X" },
  { key: "discordUrl", platform: "discord", label: "Discord" },
  { key: "youtubeUrl", platform: "youtube", label: "YouTube" },
]

const POLICY_KIND_BY_HANDLE: Record<string, ShopPolicyKind> = {
  "privacy-policy": "privacyPolicy",
  "refund-policy": "refundPolicy",
  "shipping-policy": "shippingPolicy",
  "terms-of-service": "termsOfService",
}

function metafieldString(
  field: ShopifyContentMetafields[keyof ShopifyContentMetafields]
): string | null {
  const value = field?.value?.trim()
  return value ? value : null
}

function mapSocialLinks(source: ShopifyContentMetafields): SocialLink[] {
  const links: SocialLink[] = []

  for (const entry of SOCIAL_FIELDS) {
    const href = metafieldString(source[entry.key])
    if (!href) continue
    links.push({
      platform: entry.platform,
      label: entry.label,
      href,
    })
  }

  return links
}

function mapContactDetails(source: ShopifyContentMetafields): ContactDetails {
  return {
    email: metafieldString(source.businessEmail),
    responseTime: metafieldString(source.responseTime),
    social: mapSocialLinks(source),
  }
}

function mergeContactDetails(
  primary: ContactDetails,
  fallback: ContactDetails
): ContactDetails | null {
  const email = primary.email ?? fallback.email
  const responseTime = primary.responseTime ?? fallback.responseTime
  const social = primary.social.length > 0 ? primary.social : fallback.social

  if (!email && !responseTime && social.length === 0) {
    return null
  }

  return { email, responseTime, social }
}

function mapPolicy(
  kind: ShopPolicyKind,
  policy: ShopifyShopPolicy
): ShopPolicy | null {
  if (!policy?.handle || !policy.title) return null

  return {
    kind,
    handle: policy.handle,
    title: policy.title,
    bodyHtml: sanitizeShopifyHtml(policy.body ?? ""),
  }
}

function emptyShopContent(): ShopContentSettings {
  return {
    shopName: "Swift TCG",
    contact: { email: null, responseTime: null, social: [] },
    policies: [],
  }
}

/**
 * Shop-level contact/social metafields and native policy summaries.
 * Safe to call from layout chrome — returns empty defaults on failure.
 */
export const getShopContentSettings = cache(
  async (): Promise<ShopContentSettings> => {
    try {
      const data = await shopifyFetch<ShopContentQueryResult>({
        query: GET_SHOP_CONTENT,
      })

      const policies = (
        [
          mapPolicy("privacyPolicy", data.shop.privacyPolicy),
          mapPolicy("refundPolicy", data.shop.refundPolicy),
          mapPolicy("shippingPolicy", data.shop.shippingPolicy),
          mapPolicy("termsOfService", data.shop.termsOfService),
        ] as Array<ShopPolicy | null>
      ).filter((policy): policy is ShopPolicy => policy !== null)

      return {
        shopName: data.shop.name?.trim() || "Swift TCG",
        contact: mapContactDetails(data.shop),
        policies,
      }
    } catch (error) {
      if (error instanceof ShopifyClientError) {
        console.error("[shopify/content] getShopContentSettings:", error.message)
        return emptyShopContent()
      }
      throw error
    }
  }
)

/**
 * Load a Shopify Online Store page by handle.
 * Returns null when the page does not exist.
 */
export const getShopifyPageByHandle = cache(
  async (handle: string): Promise<ContentPage | null> => {
    const normalized = handle.trim().toLowerCase()
    if (!normalized) return null

    const pageData = await shopifyFetch<PageByHandleQueryResult>({
      query: GET_PAGE_BY_HANDLE,
      variables: { handle: normalized },
    })

    const page = pageData.page
    if (!page) return null

    const shop = await getShopContentSettings()
    const pageContact = mapContactDetails(page)
    const contact = mergeContactDetails(pageContact, shop.contact)

    return {
      id: page.id,
      handle: page.handle,
      title: page.title,
      bodyHtml: sanitizeShopifyHtml(page.body ?? ""),
      bodySummary: page.bodySummary?.trim() ?? "",
      seo: {
        title: page.seo?.title ?? null,
        description: page.seo?.description ?? null,
      },
      contact,
    }
  }
)

/**
 * Resolve a Shopify native policy by its handle (e.g. `shipping-policy`).
 */
export const getShopifyPolicyByHandle = cache(
  async (handle: string): Promise<ShopPolicy | null> => {
    const normalized = handle.trim().toLowerCase()
    if (!normalized) return null

    const shop = await getShopContentSettings()
    const direct = shop.policies.find((policy) => policy.handle === normalized)
    if (direct) return direct

    const kind = POLICY_KIND_BY_HANDLE[normalized]
    if (!kind) return null

    return shop.policies.find((policy) => policy.kind === kind) ?? null
  }
)

/** Canonical storefront paths for known content handles (footer / nav). */
export const CONTENT_PAGE_PATHS = {
  about: "/pages/about",
  contact: "/pages/contact",
  faq: "/pages/faq",
  preorderPolicy: "/pages/preorder-policy",
} as const

export const POLICY_PATHS = {
  shipping: "/policies/shipping-policy",
  refund: "/policies/refund-policy",
  privacy: "/policies/privacy-policy",
  terms: "/policies/terms-of-service",
} as const
