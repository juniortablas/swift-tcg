/**
 * JSON-LD builders + safe serialization for Google Rich Results.
 */

import type { Product } from "@/types/product"
import type { ProductReview, ReviewSummary } from "@/lib/reviews/types"

import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  getSiteOrigin,
  SITE_NAME,
} from "./config"
import { stripHtml, truncateMeta } from "./html"

export type JsonLd = Record<string, unknown>

/** Escape JSON for embedding in <script type="application/ld+json">. */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

export type BreadcrumbItem = {
  name: string
  path: string
}

export function breadcrumbListJsonLd(items: BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function organizationJsonLd(): JsonLd {
  const origin = getSiteOrigin()
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: SITE_NAME,
    url: `${origin}/`,
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
  }
}

/**
 * WebSite + SearchAction.
 * Target matches the public `/search` results page.
 */
export function websiteJsonLd(): JsonLd {
  const origin = getSiteOrigin()
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: SITE_NAME,
    url: `${origin}/`,
    description: DEFAULT_DESCRIPTION,
    publisher: { "@id": `${origin}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

function offerAvailability(status: Product["status"]): string {
  if (status === "preorder") return "https://schema.org/PreOrder"
  if (status === "soldout") return "https://schema.org/OutOfStock"
  if (status === "instock") return "https://schema.org/InStock"
  return "https://schema.org/OutOfStock"
}

function productDescription(product: Product): string {
  const fromSeo = product.seoDescription?.trim()
  if (fromSeo) return truncateMeta(fromSeo, 5000)

  const fromPlain = product.description?.trim()
  if (fromPlain) return truncateMeta(fromPlain, 5000)

  const fromHtml = stripHtml(product.descriptionHtml)
  if (fromHtml) return truncateMeta(fromHtml, 5000)

  return truncateMeta(
    `Buy ${product.title} from ${SITE_NAME}. Authentic Japanese TCG, factory sealed when stated, shipped from the USA.`,
    5000
  )
}

export function productJsonLd(options: {
  product: Product
  summary?: ReviewSummary | null
  reviews?: ProductReview[]
}): JsonLd {
  const { product, summary, reviews = [] } = options
  const url = absoluteUrl(product.url || `/products/${product.slug}`)
  const images = product.image ? [product.image] : undefined
  const brandName = product.vendor?.trim() || SITE_NAME
  const currency = product.currencyCode?.trim() || "USD"

  const schema: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: productDescription(product),
    sku: product.productCode ?? product.slug,
    url,
    image: images,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    category: product.category || undefined,
  }

  if (product.productType?.trim()) {
    schema.additionalType = product.productType.trim()
  }

  if (product.price != null && product.price > 0) {
    schema.offers = {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      price: product.price.toFixed(2),
      availability: offerAvailability(product.status),
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    }
  }

  if (summary && summary.count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: summary.average.toFixed(1),
      reviewCount: summary.count,
      bestRating: "5",
      worstRating: "1",
    }

    const approved = reviews.filter((review) => review.status === "approved")
    if (approved.length > 0) {
      schema.review = approved.slice(0, 10).map((review) => ({
        "@type": "Review",
        name: review.title ?? undefined,
        reviewBody: review.body,
        datePublished: review.reviewedAt,
        author: {
          "@type": "Person",
          name: review.displayName,
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: String(review.rating),
          bestRating: "5",
          worstRating: "1",
        },
      }))
    }
  }

  return schema
}

export function collectionPageJsonLd(options: {
  name: string
  description: string
  path: string
  image?: string | null
}): JsonLd {
  const url = absoluteUrl(options.path)
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: options.name,
    description: truncateMeta(options.description, 5000),
    url,
    ...(options.image
      ? {
          primaryImageOfPage: {
            "@type": "ImageObject",
            url: options.image.startsWith("http")
              ? options.image
              : absoluteUrl(options.image),
          },
        }
      : {}),
    isPartOf: {
      "@id": `${getSiteOrigin()}/#website`,
    },
  }
}
