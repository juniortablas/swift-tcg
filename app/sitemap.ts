import type { MetadataRoute } from "next"

import { absoluteUrl, getSiteOrigin } from "@/lib/seo"
import { discoverPrimaryTcgCollections } from "@/lib/shopify/browseHierarchy"
import { getShopifyCollectionLanguageFacets } from "@/lib/shopify/collectionFacets"
import {
  listSitemapCollections,
  listSitemapPages,
  listSitemapProducts,
} from "@/lib/shopify/collectionSeo"
import { CONTENT_PAGE_PATHS, POLICY_PATHS } from "@/lib/shopify/content"
import { RESERVED_GAME_HANDLES } from "@/lib/shopify/reservedHandles"

/**
 * Rebuild at most hourly on Vercel so new products/collections appear without
 * a full redeploy. Metadata routes are otherwise cached indefinitely.
 */
export const revalidate = 3600

const MERCH_ROUTES = [
  { path: "/preorders", handle: "preorders" },
  { path: "/new-releases", handle: "new-arrivals" },
] as const

function entry(
  path: string,
  options: {
    lastModified?: string | Date | null
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]
    priority?: number
    images?: string[]
  } = {}
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified: options.lastModified || new Date(),
    changeFrequency: options.changeFrequency ?? "weekly",
    priority: options.priority ?? 0.7,
    ...(options.images && options.images.length > 0
      ? { images: options.images }
      : {}),
  }
}

/**
 * App Router sitemap → served at `/sitemap.xml`.
 * Uses Storefront loaders only (products, collections, CMS pages, policies).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Resolve origin once so absolute URLs match robots.txt / metadataBase.
  void getSiteOrigin()

  const urls: MetadataRoute.Sitemap = [
    entry("/", { changeFrequency: "daily", priority: 1 }),
  ]

  try {
    const [products, collections, pages, primaryGames] = await Promise.all([
      listSitemapProducts(),
      listSitemapCollections(),
      listSitemapPages(),
      discoverPrimaryTcgCollections(),
    ])

    const collectionByHandle = new Map(
      collections.map((collection) => [collection.handle, collection])
    )

    for (const game of primaryGames) {
      if (RESERVED_GAME_HANDLES.has(game.handle)) continue
      const meta = collectionByHandle.get(game.handle)
      urls.push(
        entry(`/${game.handle}`, {
          lastModified: meta?.updatedAt,
          changeFrequency: "daily",
          priority: 0.9,
          images: meta?.imageUrl
            ? [meta.imageUrl]
            : game.imageUrl
              ? [game.imageUrl]
              : undefined,
        })
      )

      try {
        const facets = await getShopifyCollectionLanguageFacets(game.handle)
        for (const facet of facets) {
          if (facet.productCount <= 0) continue
          const facetMeta = collectionByHandle.get(facet.handle)
          urls.push(
            entry(`/${game.handle}/${facet.slug}`, {
              lastModified: facetMeta?.updatedAt,
              changeFrequency: "daily",
              priority: 0.8,
              images: facet.imageUrl
                ? [facet.imageUrl]
                : facetMeta?.imageUrl
                  ? [facetMeta.imageUrl]
                  : undefined,
            })
          )
        }
      } catch {
        // Skip language URLs when facet discovery fails for a game.
      }
    }

    for (const merch of MERCH_ROUTES) {
      const meta = collectionByHandle.get(merch.handle)
      urls.push(
        entry(merch.path, {
          lastModified: meta?.updatedAt,
          changeFrequency: "daily",
          priority: 0.85,
          images: meta?.imageUrl ? [meta.imageUrl] : undefined,
        })
      )

      for (const game of primaryGames) {
        if (RESERVED_GAME_HANDLES.has(game.handle)) continue
        urls.push(
          entry(`${merch.path}/${game.handle}`, {
            changeFrequency: "daily",
            priority: 0.75,
          })
        )

        try {
          const facets = await getShopifyCollectionLanguageFacets(game.handle)
          for (const facet of facets) {
            if (facet.productCount <= 0) continue
            urls.push(
              entry(`${merch.path}/${game.handle}/${facet.slug}`, {
                changeFrequency: "daily",
                priority: 0.7,
              })
            )
          }
        } catch {
          // Ignore facet errors for merch language URLs.
        }
      }
    }

    for (const product of products) {
      urls.push(
        entry(`/products/${product.handle}`, {
          lastModified: product.updatedAt,
          changeFrequency: "weekly",
          priority: 0.8,
          images: product.imageUrl ? [product.imageUrl] : undefined,
        })
      )
    }

    const knownPagePaths = new Set<string>(Object.values(CONTENT_PAGE_PATHS))
    for (const page of pages) {
      const path = `/pages/${page.handle}`
      urls.push(
        entry(path, {
          lastModified: page.updatedAt,
          changeFrequency: "monthly",
          priority: knownPagePaths.has(path) ? 0.6 : 0.5,
        })
      )
    }

    for (const path of Object.values(CONTENT_PAGE_PATHS)) {
      if (urls.some((item) => item.url === absoluteUrl(path))) continue
      urls.push(entry(path, { changeFrequency: "monthly", priority: 0.6 }))
    }

    for (const path of Object.values(POLICY_PATHS)) {
      urls.push(entry(path, { changeFrequency: "yearly", priority: 0.4 }))
    }
  } catch (error) {
    console.error("[sitemap] Failed to load Shopify URLs:", error)
    // Still emit a minimal public sitemap so /sitemap.xml never 500s.
    for (const path of Object.values(CONTENT_PAGE_PATHS)) {
      urls.push(entry(path, { changeFrequency: "monthly", priority: 0.6 }))
    }
    for (const path of Object.values(POLICY_PATHS)) {
      urls.push(entry(path, { changeFrequency: "yearly", priority: 0.4 }))
    }
    urls.push(
      entry("/preorders", { changeFrequency: "daily", priority: 0.85 }),
      entry("/new-releases", { changeFrequency: "daily", priority: 0.85 }),
      entry("/pokemon", { changeFrequency: "daily", priority: 0.9 }),
      entry("/one-piece", { changeFrequency: "daily", priority: 0.9 })
    )
  }

  return urls
}
