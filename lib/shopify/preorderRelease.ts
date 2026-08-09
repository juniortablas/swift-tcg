/**
 * Preorder → in-stock release workflow.
 *
 * Sync never auto-converts preorders to in-stock when the release date passes.
 * Instead it marks them `ready-to-release` (internal). A merchant approves in
 * Shopify by adding the `release-approved` tag; the next sync then converts
 * availability to in-stock, leaves preorders, and joins new-arrivals when
 * eligible. The `released` tag makes conversion sticky/idempotent even if the
 * catalog import still reports `preorder`.
 *
 * Storefront mapping ignores these workflow tags — only `preorder` affects
 * storefront availability.
 */

import { getProductReleaseDate } from "@/lib/catalog/homepage"
import type { Product, ProductStatus } from "@/types/product"

/** Internal: release date reached; still sold as preorder on the storefront. */
export const READY_TO_RELEASE_TAG = "ready-to-release"

/** Merchant approval signal in Shopify Admin — consumed on the next sync. */
export const RELEASE_APPROVED_TAG = "release-approved"

/**
 * Sticky marker written after an approved conversion so a catalog that still
 * says `preorder` cannot undo the release on later syncs.
 */
export const RELEASED_TAG = "released"

export type PreorderReleaseProduct = {
  status: ProductStatus
  title: string
  slug?: string
  releaseDate?: string | null
}

export type PreorderReleasePlan = {
  /** Status used for tags + collection membership (not a storefront-only field). */
  effectiveStatus: ProductStatus
  /** Include `ready-to-release` while still preorder and past release date. */
  markReadyToRelease: boolean
  /** Persist `released` after approval so conversion stays idempotent. */
  markReleased: boolean
  /** Short reason for logs / diffs. */
  reason: string
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

function tagSet(tags: string[] | undefined): Set<string> {
  return new Set((tags ?? []).map(normalizeTag).filter(Boolean))
}

/** Calendar date in UTC as YYYY-MM-DD. */
export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * True when `releaseDate` is today or earlier (date-only, YYYY-MM-DD).
 * Missing / invalid dates never qualify.
 */
export function hasReachedReleaseDate(
  releaseDate: string | null | undefined,
  today: string = todayIsoDate()
): boolean {
  if (!releaseDate) return false
  const iso = releaseDate.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return iso <= today
}

function toProductLike(product: PreorderReleaseProduct): Product {
  return {
    id: product.slug ?? "sync",
    slug: product.slug ?? "",
    title: product.title,
    category: "",
    image: "",
    price: null,
    url: "",
    status: product.status,
    releaseDate: product.releaseDate,
  }
}

/** Resolve the release / ship date used for ready-to-release detection. */
export function resolveSyncReleaseDate(
  product: PreorderReleaseProduct
): string | null {
  return getProductReleaseDate(toProductLike(product))
}

/**
 * Plan the preorder release outcome for one product.
 *
 * Idempotent:
 * - Past release date + still preorder → ready-to-release (no status change)
 * - `release-approved` or sticky `released` → effective in-stock
 * - Already converted (`released`) stays in-stock on re-sync
 */
export function planPreorderRelease(
  product: PreorderReleaseProduct,
  existingTags?: string[],
  today: string = todayIsoDate()
): PreorderReleasePlan {
  const existing = tagSet(existingTags)

  // Catalog already left preorder — clear workflow staging tags; no sticky needed.
  if (product.status !== "preorder") {
    return {
      effectiveStatus: product.status,
      markReadyToRelease: false,
      markReleased: false,
      reason: "catalog-status",
    }
  }

  // Merchant approved, or a prior sync already converted this SKU.
  if (existing.has(RELEASED_TAG) || existing.has(RELEASE_APPROVED_TAG)) {
    return {
      effectiveStatus: "instock",
      markReadyToRelease: false,
      markReleased: true,
      reason: existing.has(RELEASE_APPROVED_TAG)
        ? "release-approved"
        : "already-released",
    }
  }

  const releaseDate = resolveSyncReleaseDate(product)
  if (hasReachedReleaseDate(releaseDate, today)) {
    return {
      effectiveStatus: "preorder",
      markReadyToRelease: true,
      markReleased: false,
      reason: "ready-to-release",
    }
  }

  return {
    effectiveStatus: "preorder",
    markReadyToRelease: false,
    markReleased: false,
    reason: "preorder-pending",
  }
}

/**
 * Apply workflow tags onto a tag set that already reflects `effectiveStatus`
 * (i.e. `preorder` is present only when still a preorder).
 *
 * Always consumes `release-approved` (one-shot approval).
 */
export function applyReleaseWorkflowTags(
  tags: Set<string>,
  plan: PreorderReleasePlan
): void {
  // Approval is consumed once conversion is planned.
  tags.delete(RELEASE_APPROVED_TAG)

  if (plan.markReadyToRelease) {
    tags.add(READY_TO_RELEASE_TAG)
  } else {
    tags.delete(READY_TO_RELEASE_TAG)
  }

  if (plan.markReleased) {
    tags.add(RELEASED_TAG)
  } else {
    tags.delete(RELEASED_TAG)
  }
}
