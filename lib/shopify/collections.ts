/**
 * Shared Shopify collection discovery loaders.
 *
 * Deduplicates the paginated `GET_COLLECTIONS` walk used by facet and
 * browse-hierarchy modules. React `cache` + Data Cache tags keep per-request
 * and cross-request work cheap.
 */

import { cache } from "react"

import { catalogFetchOptions } from "./cache"
import { shopifyFetch } from "./client"
import {
  GET_COLLECTION_FIRST_PRODUCT_IMAGE,
  GET_COLLECTIONS,
} from "./queries"
import type { Collection, CollectionsQueryResult } from "./types"

/**
 * Fetch every published collection (list fields only).
 * Shared by language facets + primary TCG discovery.
 */
export const getAllShopifyCollections = cache(
  async (): Promise<Collection[]> => {
    const nodes: Collection[] = []
    let after: string | null | undefined
    let hasNextPage = true

    while (hasNextPage) {
      const data = await shopifyFetch<CollectionsQueryResult>({
        query: GET_COLLECTIONS,
        variables: {
          first: 50,
          ...(after ? { after } : {}),
        },
        ...catalogFetchOptions,
      })

      for (const edge of data.collections.edges) {
        nodes.push(edge.node)
      }

      hasNextPage = data.collections.pageInfo?.hasNextPage ?? false
      after = data.collections.pageInfo?.endCursor ?? undefined
    }

    return nodes
  }
)

type FirstProductImageResult = {
  collection: {
    products: {
      edges: Array<{
        node: {
          title: string
          featuredImage: { url: string; altText: string | null } | null
        }
      }>
    }
  } | null
}

/**
 * Prefer the collection image; otherwise the first product's featured image.
 * Uses a slim GraphQL selection (no product card / variants payload).
 */
export async function resolveCollectionImage(
  handle: string,
  collectionImage: Collection["image"]
): Promise<{ url: string | null; alt: string | null }> {
  if (collectionImage?.url) {
    return {
      url: collectionImage.url,
      alt: collectionImage.altText,
    }
  }

  try {
    const data = await shopifyFetch<FirstProductImageResult>({
      query: GET_COLLECTION_FIRST_PRODUCT_IMAGE,
      variables: { handle },
      ...catalogFetchOptions,
    })
    const product = data.collection?.products.edges[0]?.node
    const image = product?.featuredImage
    if (image?.url) {
      return {
        url: image.url,
        alt: image.altText ?? product?.title ?? null,
      }
    }
  } catch {
    // Best-effort image only — facet still works without art.
  }

  return { url: null, alt: null }
}
