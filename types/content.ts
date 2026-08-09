/**
 * Domain types for Shopify-managed informational content.
 * UI components consume these — never raw Storefront API shapes.
 */

export type ContentSeo = {
  title: string | null
  description: string | null
}

export type ContentPage = {
  id: string
  handle: string
  title: string
  /** Sanitized HTML from Shopify page body. */
  bodyHtml: string
  bodySummary: string
  seo: ContentSeo
  /** Optional structured contact fields (page metafields, shop fallback). */
  contact: ContactDetails | null
}

export type ShopPolicyKind =
  | "privacyPolicy"
  | "refundPolicy"
  | "shippingPolicy"
  | "termsOfService"

export type ShopPolicy = {
  kind: ShopPolicyKind
  handle: string
  title: string
  /** Sanitized HTML from Shopify policy body. */
  bodyHtml: string
}

export type SocialPlatform =
  | "instagram"
  | "x"
  | "discord"
  | "youtube"

export type SocialLink = {
  platform: SocialPlatform
  label: string
  href: string
}

export type ContactDetails = {
  email: string | null
  responseTime: string | null
  social: SocialLink[]
}

export type ShopContentSettings = {
  shopName: string
  contact: ContactDetails
  policies: ShopPolicy[]
}
