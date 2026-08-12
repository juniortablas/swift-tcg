/**
 * Collection lookups for SEO metadata and sitemaps.
 */

import { cache } from "react"

import { shopifyFetch } from "./client"
import {
  GET_COLLECTION_BY_HANDLE,
  GET_COLLECTIONS_SITEMAP,
  GET_PAGES,
  GET_PRODUCTS_SITEMAP,
} from "./queries"
import type { Collection, ShopifySeo } from "./types"

export type ShopifyCollectionSeo = {
  handle: string
  title: string
  description: string
  descriptionHtml: string | null
  seo: ShopifySeo
  imageUrl: string | null
  imageAlt: string | null
  updatedAt: string | null
}

export type SitemapProductEntry = {
  handle: string
  updatedAt: string | null
  imageUrl: string | null
}

export type SitemapCollectionEntry = {
  handle: string
  title: string
  updatedAt: string | null
  imageUrl: string | null
}

export type SitemapPageEntry = {
  handle: string
  updatedAt: string | null
}

type CollectionByHandleResult = {
  collection: Collection | null
}

type ProductsSitemapResult = {
  products: {
    edges: Array<{
      cursor?: string
      node: {
        handle: string
        updatedAt?: string | null
        featuredImage: { url: string } | null
      }
    }>
    pageInfo?: { hasNextPage: boolean; endCursor?: string | null }
  }
}

type CollectionsSitemapResult = {
  collections: {
    edges: Array<{
      cursor?: string
      node: {
        handle: string
        title: string
        updatedAt?: string | null
        image: { url: string } | null
      }
    }>
    pageInfo?: { hasNextPage: boolean; endCursor?: string | null }
  }
}

type PagesResult = {
  pages: {
    edges: Array<{
      cursor?: string
      node: {
        handle: string
        updatedAt?: string | null
      }
    }>
    pageInfo?: { hasNextPage: boolean; endCursor?: string | null }
  }
}

function mapCollectionSeo(collection: Collection): ShopifyCollectionSeo {
  return {
    handle: collection.handle,
    title: collection.title,
    description: collection.description?.trim() || "",
    descriptionHtml: collection.descriptionHtml?.trim() || null,
    seo: {
      title: collection.seo?.title ?? null,
      description: collection.seo?.description ?? null,
    },
    imageUrl: collection.image?.url ?? null,
    imageAlt: collection.image?.altText ?? null,
    updatedAt: collection.updatedAt ?? null,
  }
}

/**
 * Fetch a single collection by handle for SEO (cached per request).
 */
export const getShopifyCollectionByHandle = cache(
  async (handle: string): Promise<ShopifyCollectionSeo | null> => {
    const normalized = handle.trim().toLowerCase()
    if (!normalized) return null

    const data = await shopifyFetch<CollectionByHandleResult>({
      query: GET_COLLECTION_BY_HANDLE,
      variables: { handle: normalized },
    })

    if (!data.collection) return null
    return mapCollectionSeo(data.collection)
  }
)

export async function listSitemapProducts(): Promise<SitemapProductEntry[]> {
  const entries: SitemapProductEntry[] = []
  let after: string | null | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<ProductsSitemapResult>({
      query: GET_PRODUCTS_SITEMAP,
      variables: { first: 100, ...(after ? { after } : {}) },
    })

    for (const edge of data.products.edges) {
      const handle = edge.node.handle?.trim()
      if (!handle) continue
      entries.push({
        handle,
        updatedAt: edge.node.updatedAt ?? null,
        imageUrl: edge.node.featuredImage?.url ?? null,
      })
    }

    hasNextPage = data.products.pageInfo?.hasNextPage ?? false
    after = data.products.pageInfo?.endCursor ?? undefined
  }

  return entries
}

export async function listSitemapCollections(): Promise<
  SitemapCollectionEntry[]
> {
  const entries: SitemapCollectionEntry[] = []
  let after: string | null | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<CollectionsSitemapResult>({
      query: GET_COLLECTIONS_SITEMAP,
      variables: { first: 50, ...(after ? { after } : {}) },
    })

    for (const edge of data.collections.edges) {
      const handle = edge.node.handle?.trim()
      if (!handle) continue
      entries.push({
        handle,
        title: edge.node.title,
        updatedAt: edge.node.updatedAt ?? null,
        imageUrl: edge.node.image?.url ?? null,
      })
    }

    hasNextPage = data.collections.pageInfo?.hasNextPage ?? false
    after = data.collections.pageInfo?.endCursor ?? undefined
  }

  return entries
}

export async function listSitemapPages(): Promise<SitemapPageEntry[]> {
  const entries: SitemapPageEntry[] = []
  let after: string | null | undefined
  let hasNextPage = true

  while (hasNextPage) {
    const data = await shopifyFetch<PagesResult>({
      query: GET_PAGES,
      variables: { first: 50, ...(after ? { after } : {}) },
    })

    for (const edge of data.pages.edges) {
      const handle = edge.node.handle?.trim()
      if (!handle) continue
      entries.push({
        handle,
        updatedAt: edge.node.updatedAt ?? null,
      })
    }

    hasNextPage = data.pages.pageInfo?.hasNextPage ?? false
    after = data.pages.pageInfo?.endCursor ?? undefined
  }

  return entries
}
