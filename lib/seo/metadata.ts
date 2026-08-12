/**
 * Shared Next.js Metadata builders for public storefront routes.
 */

import type { Metadata } from "next"

import type { Product } from "@/types/product"

import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
} from "./config"
import { stripHtml, truncateMeta } from "./html"

export type BuildPageMetadataInput = {
  title: string
  description?: string | null
  path: string
  /** Absolute or site-relative image URL. */
  image?: string | null
  imageAlt?: string | null
  keywords?: string[] | null
  type?: "website" | "article"
  /** Override robots (account / maintenance use noindex). */
  robots?: Metadata["robots"]
  /** When false, do not append "| Swift TCG" via title template (absolute title). */
  absoluteTitle?: boolean
}

function resolveImage(image?: string | null): string {
  const value = image?.trim()
  if (!value) return DEFAULT_OG_IMAGE
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  return value.startsWith("/") ? value : `/${value}`
}

/**
 * Canonical public-page metadata: title, description, canonical, OG, Twitter, robots.
 */
export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const title = input.title.trim() || DEFAULT_TITLE
  const description = truncateMeta(
    input.description?.trim() || DEFAULT_DESCRIPTION
  )
  const canonical = absoluteUrl(input.path)
  const image = resolveImage(input.image)
  const imageAlt = input.imageAlt?.trim() || title
  const keywords =
    input.keywords && input.keywords.length > 0
      ? input.keywords
      : [...DEFAULT_KEYWORDS]

  return {
    title: input.absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: {
      canonical: input.path.startsWith("http") ? input.path : input.path || "/",
    },
    robots: input.robots ?? {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: input.type ?? "website",
      locale: "en_US",
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: image,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export function productMetaDescription(product: Product): string {
  const seo = product.seoDescription?.trim()
  if (seo) return truncateMeta(seo)

  const plain = product.description?.trim()
  if (plain) return truncateMeta(plain)

  const fromHtml = stripHtml(product.descriptionHtml)
  if (fromHtml) return truncateMeta(fromHtml)

  const type = product.productType?.trim()
  const category = product.category?.trim()
  const bits = [
    product.title,
    type ? `— ${type}` : null,
    category ? `from the ${category} catalog` : null,
    "Authentic Japanese TCG at Swift TCG. Factory sealed when stated. Ships from the USA.",
  ].filter(Boolean)

  return truncateMeta(bits.join(" "))
}

export function productMetaTitle(product: Product): string {
  const seo = product.seoTitle?.trim()
  if (seo) return seo
  return product.title
}

export function productKeywords(product: Product): string[] {
  const keywords = new Set<string>()
  keywords.add(product.title)
  if (product.category) keywords.add(product.category)
  if (product.productType) keywords.add(product.productType)
  if (product.vendor) keywords.add(product.vendor)
  if (product.series) keywords.add(product.series)
  for (const tag of product.tags ?? []) {
    const trimmed = tag.trim()
    if (trimmed) keywords.add(trimmed)
  }
  keywords.add(SITE_NAME)
  return [...keywords].slice(0, 24)
}

/**
 * Product metadata including Open Graph product price hints via `other`.
 */
export function buildProductMetadata(product: Product): Metadata {
  const title = productMetaTitle(product)
  const description = productMetaDescription(product)
  const path = product.url || `/products/${product.slug}`
  const image = product.image || DEFAULT_OG_IMAGE
  const imageAlt = product.imageAlt?.trim() || product.title
  const base = buildPageMetadata({
    title,
    description,
    path,
    image,
    imageAlt,
    keywords: productKeywords(product),
  })

  const other: Record<string, string> = {}
  if (product.price != null && product.price > 0) {
    other["product:price:amount"] = product.price.toFixed(2)
    other["product:price:currency"] = product.currencyCode?.trim() || "USD"
  }
  if (product.status === "instock") {
    other["product:availability"] = "in stock"
  } else if (product.status === "preorder") {
    other["product:availability"] = "preorder"
  } else if (product.status === "soldout") {
    other["product:availability"] = "out of stock"
  }
  if (product.vendor?.trim()) {
    other["product:brand"] = product.vendor.trim()
  }
  if (product.productType?.trim()) {
    other["product:retailer_item_id"] = product.slug
  }

  return {
    ...base,
    ...(Object.keys(other).length > 0 ? { other } : {}),
  }
}
