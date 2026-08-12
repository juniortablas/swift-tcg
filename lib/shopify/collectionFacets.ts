/**
 * Discover language (or other) child collections under a TCG parent handle.
 *
 * Convention (no hardcoded games/languages): any Shopify collection whose
 * handle is `{parentHandle}-{facet}` is treated as a facet of that TCG.
 * Example: parent `pokemon` → `pokemon-japanese`, `pokemon-korean`.
 */

import {
  getAllShopifyCollections,
  resolveCollectionImage,
} from "./collections"
import type { Collection } from "./types"

export type CollectionLanguageFacet = {
  /** Full Shopify collection handle (`pokemon-japanese`). */
  handle: string
  /** Suffix after the parent handle (`japanese`). */
  slug: string
  /** Customer-facing label derived from the handle suffix. */
  label: string
  /** Collection image URL when Shopify provides one. */
  imageUrl: string | null
  /** Alt text for the collection image. */
  imageAlt: string | null
  /**
   * Products in this language within the parent TCG catalog.
   * Filled by `enrichLanguageFacets` from the loaded product list.
   */
  productCount: number
}

function humanizeFacetSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

/** Prefer the collection image; otherwise the first product image in that collection. */
async function resolveFacetImage(
  handle: string,
  collectionImage: Collection["image"]
): Promise<{ url: string | null; alt: string | null }> {
  return resolveCollectionImage(handle, collectionImage)
}

/**
 * List language/category facets for a primary TCG collection handle.
 * Returns [] when the parent has no `{parent}-*` child collections.
 * Product counts are filled later via `enrichLanguageFacets`.
 */
export async function getShopifyCollectionLanguageFacets(
  parentHandle: string
): Promise<CollectionLanguageFacet[]> {
  const parent = parentHandle.trim().toLowerCase()
  if (!parent) return []

  const prefix = `${parent}-`
  const collections = await getAllShopifyCollections()

  const matched = collections
    .map((collection) => {
      const handle = collection.handle.trim().toLowerCase()
      if (!handle.startsWith(prefix)) return null

      const slug = handle.slice(prefix.length)
      if (!slug || slug.includes("/")) return null

      return {
        collection,
        slug,
        label: humanizeFacetSlug(slug),
      }
    })
    .filter(
      (entry): entry is NonNullable<typeof entry> => entry != null
    )

  const facets = await Promise.all(
    matched.map(async ({ collection, slug, label }) => {
      const image = await resolveFacetImage(collection.handle, collection.image)
      return {
        handle: collection.handle,
        slug,
        label,
        imageUrl: image.url,
        imageAlt: image.alt,
        productCount: 0,
      } satisfies CollectionLanguageFacet
    })
  )

  return facets.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Attach product counts from the parent TCG product list.
 * Preserves Shopify collection images; only falls back to a product image
 * when the collection has no image of its own.
 */
export function enrichLanguageFacets(
  facets: CollectionLanguageFacet[],
  products: Array<{
    title: string
    slug: string
    image?: string
    tags?: string[]
  }>
): CollectionLanguageFacet[] {
  return facets.map((facet) => {
    const matches = products.filter((product) =>
      productMatchesLanguageFacet(product, facet.slug)
    )
    const fallbackImage = matches.find((product) => product.image)?.image

    return {
      ...facet,
      productCount: matches.length,
      // Prefer Shopify collection image; product art is fallback only.
      imageUrl: facet.imageUrl || fallbackImage || null,
      imageAlt:
        facet.imageAlt ?? (facet.label ? `${facet.label} products` : null),
    }
  })
}

/**
 * Whether a product belongs to a language facet.
 * Prefers Shopify tags matching the facet slug; falls back to title/handle.
 */
export function productMatchesLanguageFacet(
  product: { title: string; slug: string; tags?: string[] },
  facetSlug: string
): boolean {
  const slug = facetSlug.trim().toLowerCase()
  if (!slug) return false

  const tags = (product.tags ?? []).map((tag) => tag.toLowerCase())
  if (tags.includes(slug)) return true

  // Handle multi-word slugs as tags with spaces or hyphens.
  if (tags.includes(slug.replace(/-/g, " "))) return true

  const haystack = `${product.title} ${product.slug}`.toLowerCase()
  const needle = slug.replace(/-/g, " ")
  return (
    new RegExp(`\\b${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(
      haystack
    ) ||
    new RegExp(
      `\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`
    ).test(haystack)
  )
}
