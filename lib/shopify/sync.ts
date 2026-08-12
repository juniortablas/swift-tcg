/**
 * Shopify catalog sync helpers.
 *
 * Product create/update matches by handle (never duplicates). Unchanged
 * catalog fields are skipped. After each write, assign standard collections via
 * handle/title lookup — missing collections are created automatically. New and
 * existing products are ensured published to the Headless and Shop sales
 * channels.
 *
 * Shopify owns merchandising after create: selling price, compare-at price,
 * product status, SEO title/description are never overwritten on update.
 *
 * Hybrid preorder release: past release dates are marked `ready-to-release`
 * without changing storefront availability. Merchant approval (`release-approved`
 * tag) converts to in-stock on the next sync — leaves `preorders`, joins
 * `new-arrivals` when eligible. See `lib/shopify/preorderRelease.ts`.
 *
 * DRY_RUN: set DRY_RUN=1 / SHOPIFY_DRY_RUN=1 or pass `--dry-run` / `{ dryRun: true }`.
 * Reads are allowed; no Admin mutations run.
 */

import type { Product, ProductStatus } from "@/types/product"
import {
  getProductBrand,
  getProductTypeFilter,
  getProductTypeLabel,
} from "@/lib/catalog/productMeta"

import { shopifyAdminFetch } from "./admin"
import {
  applyReleaseWorkflowTags,
  planPreorderRelease,
  type PreorderReleasePlan,
} from "./preorderRelease"
import {
  getStandardCollection,
  normalizeCollectionLabel,
  STANDARD_COLLECTIONS,
  type StandardCollection,
} from "./standardCollections"

export type CollectionAssignableProduct = {
  title: string
  category: string
  status: ProductStatus
  price: number | null
  /**
   * Optional catalog language override (e.g. Chinese SORA catalog).
   * When set, wins over title-based `detectProductLanguage`.
   */
  language?: ProductLanguage
  /** Shopify handle — used for release-date heuristics when syncing. */
  slug?: string
  /** ISO release / ship date when known (YYYY-MM-DD). */
  releaseDate?: string | null
}

/** Catalog product shape accepted by Admin product sync. */
export type SyncableProduct = CollectionAssignableProduct & {
  id: string
  /** Shopify handle — must be unique. */
  slug: string
  /** Local public path (`/products/….webp`), optional. */
  image?: string
  /** Remote image URL Shopify can fetch (preferred for media upload). */
  imageUrl?: string
}

/** Optional sync context for release workflow + collection eligibility. */
export type SyncProductContext = {
  /** Existing Shopify tags (update path). Empty / omitted on create. */
  existingTags?: string[]
  /** Override "today" (YYYY-MM-DD) for deterministic tests. */
  today?: string
  /**
   * Shopify Admin product status (`ACTIVE` | `ARCHIVED` | `DRAFT`).
   * Archived / draft products never qualify for new-arrivals.
   */
  shopifyProductStatus?: string
  /**
   * Shopify `availableForSale`. When false, the product is not purchasable
   * and must leave new-arrivals (sold out / unavailable).
   */
  availableForSale?: boolean
}

export type ProductLanguage = "japanese" | "english" | "korean" | "chinese"

export type AssignCollectionsResult = {
  productId: string
  /** Standard collection keys requested for this product. */
  requested: string[]
  /** Collection GIDs newly joined. */
  joined: string[]
  /** Collection GIDs removed (no longer qualify for a sync-owned collection). */
  left: string[]
  /** Already a member — left unchanged. */
  alreadyMember: string[]
  /** Standard keys with no matching Shopify collection yet. */
  missing: string[]
}

export type SyncAction = "created" | "updated" | "skipped" | "failed"

export type HeadlessPublishStatus =
  | "published"
  | "already_published"
  | "unavailable"
  | "failed"

/** Same outcome set as Headless — kept as an alias for Shop channel results. */
export type ShopPublishStatus = HeadlessPublishStatus

export type SyncProductResult = {
  action: SyncAction
  handle: string
  title: string
  productId?: string
  error?: string
  /** Human-readable reasons a product was updated (empty when skipped/created). */
  changeReasons?: string[]
  /** Headless channel publish outcome for this product (when a product GID exists). */
  publishStatus?: HeadlessPublishStatus
  /** Shop sales-channel publish outcome (when a product GID exists). */
  shopPublishStatus?: ShopPublishStatus
  collections?: AssignCollectionsResult
  dryRun?: boolean
}

export type SyncProductsSummary = {
  created: number
  updated: number
  skipped: number
  failed: number
  durationMs: number
  dryRun: boolean
  results: SyncProductResult[]
}

export type SyncOptions = {
  dryRun?: boolean
  cache?: CollectionResolverCache
  /** Delay between product mutations (ms). Default 250. */
  delayMs?: number
  /** Override "today" (YYYY-MM-DD) for the hybrid release workflow. */
  today?: string
}

type AdminUserError = { field?: string[] | null; message: string; code?: string }

type CollectionLookupResult = {
  collectionByIdentifier: { id: string; handle: string; title: string } | null
}

type CollectionsSearchResult = {
  collections: {
    nodes: Array<{ id: string; handle: string; title: string }>
  }
}

type CollectionCreateResult = {
  collectionCreate: {
    collection: { id: string; handle: string; title: string } | null
    userErrors: AdminUserError[]
  }
}

type CollectionPublishedOnResult = {
  collection: { publishedOnPublication: boolean } | null
}

export type EnsureStandardCollectionsResult = {
  ensured: Array<{ key: string; id: string; created: boolean }>
  dryRun: boolean
}

type ProductCollectionsResult = {
  product: {
    id: string
    collections: { nodes: Array<{ id: string }> }
  } | null
}

type ProductUpdateResult = {
  productUpdate: {
    product: { id: string } | null
    userErrors: AdminUserError[]
  }
}

type ExistingProductResult = {
  productByIdentifier: {
    id: string
    handle: string
    title: string
    status: string
    totalInventory: number
    tracksInventory: boolean
    vendor: string
    productType: string
    tags: string[]
    descriptionHtml: string
    variants: {
      nodes: Array<{
        id: string
        price: string
        compareAtPrice: string | null
        sku: string | null
        availableForSale: boolean
        inventoryItem: { id: string; sku: string | null } | null
      }>
    }
    media: {
      nodes: Array<{
        id: string
        alt?: string | null
        preview?: { image?: { url?: string | null } | null } | null
      }>
    }
  } | null
}

type ProductCreateMutationResult = {
  productCreate: {
    product: {
      id: string
      handle: string
      variants: { nodes: Array<{ id: string }> }
      media: { nodes: Array<{ id: string }> }
    } | null
    userErrors: AdminUserError[]
  }
}

type ProductVariantsBulkUpdateResult = {
  productVariantsBulkUpdate: {
    productVariants: Array<{
      id: string
      price: string
      sku: string | null
      inventoryItem: { id: string; sku: string | null } | null
    }> | null
    userErrors: AdminUserError[]
  }
}

type ProductAddMediaResult = {
  productUpdate: {
    product: {
      id: string
      media: { nodes: Array<{ id: string }> }
    } | null
    userErrors: AdminUserError[]
  }
}

type PublicationNode = {
  id: string
  name: string | null
  catalog: {
    title: string | null
    apps?: { nodes: Array<{ title: string | null; handle: string | null }> }
  } | null
}

type PublicationsResult = {
  publications: { nodes: PublicationNode[] }
}

type ProductPublishedOnResult = {
  product: { publishedOnPublication: boolean } | null
}

type PublishablePublishResult = {
  publishablePublish: {
    userErrors: AdminUserError[]
  }
}

type HeadlessPublication = {
  id: string
  name: string
}

type ShopPublication = {
  id: string
  name: string
}

/** Process-local cache of Headless sales-channel publication targets. */
let cachedHeadlessPublications: HeadlessPublication[] | null = null
/** Process-local cache of Shop sales-channel publication targets. */
let cachedShopPublications: ShopPublication[] | null = null

const COLLECTION_BY_HANDLE = /* GraphQL */ `
  query CollectionByHandle($handle: String!) {
    collectionByIdentifier(identifier: { handle: $handle }) {
      id
      handle
      title
    }
  }
`

const COLLECTIONS_SEARCH = /* GraphQL */ `
  query CollectionsSearch($query: String!, $first: Int!) {
    collections(first: $first, query: $query) {
      nodes {
        id
        handle
        title
      }
    }
  }
`

const PRODUCT_COLLECTIONS = /* GraphQL */ `
  query ProductCollections($id: ID!) {
    product(id: $id) {
      id
      collections(first: 100) {
        nodes {
          id
        }
      }
    }
  }
`

const PRODUCT_JOIN_COLLECTIONS = /* GraphQL */ `
  mutation ProductJoinCollections($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`

const COLLECTION_CREATE = /* GraphQL */ `
  mutation CollectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        handle
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`

const COLLECTION_PUBLISHED_ON = /* GraphQL */ `
  query CollectionPublishedOn($id: ID!, $publicationId: ID!) {
    collection(id: $id) {
      publishedOnPublication(publicationId: $publicationId)
    }
  }
`

const PRODUCT_BY_HANDLE = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      handle
      title
      status
      totalInventory
      tracksInventory
      vendor
      productType
      tags
      descriptionHtml
      variants(first: 1) {
        nodes {
          id
          price
          compareAtPrice
          sku
          availableForSale
          inventoryItem {
            id
            sku
          }
        }
      }
      media(first: 10) {
        nodes {
          id
          alt
          preview {
            image {
              url
            }
          }
        }
      }
    }
  }
`

const PUBLICATIONS = /* GraphQL */ `
  query Publications($catalogType: CatalogType) {
    publications(first: 50, catalogType: $catalogType) {
      nodes {
        id
        name
        catalog {
          title
          ... on AppCatalog {
            apps(first: 10) {
              nodes {
                title
                handle
              }
            }
          }
        }
      }
    }
  }
`

const PRODUCT_PUBLISHED_ON = /* GraphQL */ `
  query ProductPublishedOn($id: ID!, $publicationId: ID!) {
    product(id: $id) {
      publishedOnPublication(publicationId: $publicationId)
    }
  }
`

const PUBLISHABLE_PUBLISH = /* GraphQL */ `
  mutation PublishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`

const PRODUCT_CREATE = /* GraphQL */ `
  mutation ProductCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        handle
        variants(first: 1) {
          nodes {
            id
          }
        }
        media(first: 5) {
          nodes {
            id
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`

const PRODUCT_UPDATE = /* GraphQL */ `
  mutation ProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`

const PRODUCT_VARIANTS_BULK_UPDATE = /* GraphQL */ `
  mutation ProductVariantsBulkUpdate(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
        sku
        inventoryItem {
          id
          sku
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`

const PRODUCT_ADD_MEDIA = /* GraphQL */ `
  mutation ProductAddMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) {
      product {
        id
        media(first: 10) {
          nodes {
            id
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`

/** In-memory cache for one importer/sync run. */
export type CollectionResolverCache = Map<string, string | null>

function isAccessoryTitle(title: string): boolean {
  const t = title.toLowerCase()
  return (
    t.includes("sleeve") ||
    t.includes("binder") ||
    t.includes("playmat") ||
    t.includes("deck box") ||
    t.includes("deckbox") ||
    /\baccessories?\b/.test(t)
  )
}

/** Aligns with `getProductTypeFilter` → `cases` / Booster Case. */
function isSealedCaseTitle(title: string): boolean {
  return /\bcase\b/i.test(title)
}

function isPokemonCategory(category: string): boolean {
  const c = normalizeCollectionLabel(category)
  return c.includes("pokemon")
}

function isOnePieceCategory(category: string): boolean {
  const c = normalizeCollectionLabel(category)
  return c.includes("one piece") || c.includes("onepiece")
}

/**
 * Infer language from product title. SORA Japanese catalogs omit markers, so
 * Japanese is the default when no language marker is present.
 */
export function detectProductLanguage(title: string): ProductLanguage {
  const t = normalizeCollectionLabel(title)

  if (/\bkorean\b/.test(t) || /\(\s*kr\s*\)/.test(t)) {
    return "korean"
  }
  if (
    /\bchinese\b/.test(t) ||
    /\(\s*cn\s*\)/.test(t) ||
    /\btraditional chinese\b/.test(t) ||
    /\bsimplified chinese\b/.test(t)
  ) {
    return "chinese"
  }
  if (/\benglish\b/.test(t) || /\(\s*en\s*\)/.test(t)) {
    return "english"
  }
  if (/\bjapanese\b/.test(t) || /\(\s*jp\s*\)/.test(t)) {
    return "japanese"
  }

  return "japanese"
}

/** Prefer catalog language override, then title markers, then Japanese default. */
export function resolveProductLanguage(
  product: Pick<CollectionAssignableProduct, "title" | "language">
): ProductLanguage {
  return product.language ?? detectProductLanguage(product.title)
}

/**
 * Collections whose membership is fully owned by sync: joined when the
 * product qualifies, left when it no longer does. Merchant-curated
 * collections (Featured, Best Sellers, Sale) are never auto-left.
 *
 * `preorders` is sync-owned so approved releases leave the collection.
 * `new-arrivals` is sync-owned so only purchasable in-stock SKUs remain.
 */
const SYNC_OWNED_COLLECTION_KEYS = ["new-arrivals", "preorders"] as const

/**
 * Shopify Admin product is purchasable for New Arrivals purposes.
 * Unknown Shopify state (create path) is treated as eligible.
 */
export function isShopifyActiveAndForSale(
  context?: SyncProductContext
): boolean {
  if (context?.shopifyProductStatus) {
    const status = context.shopifyProductStatus.trim().toUpperCase()
    if (status === "ARCHIVED" || status === "DRAFT") return false
  }
  if (context?.availableForSale === false) return false
  return true
}

/**
 * Derive whether an existing Shopify product is currently for sale.
 * Prefer variant `availableForSale`; fall back to tracked inventory > 0.
 */
export function resolveShopifyAvailableForSale(existing: {
  tracksInventory: boolean
  totalInventory: number
  variants: { nodes: Array<{ availableForSale?: boolean }> }
}): boolean {
  const variant = existing.variants.nodes[0]
  if (variant && typeof variant.availableForSale === "boolean") {
    return variant.availableForSale
  }
  if (existing.tracksInventory) {
    return existing.totalInventory > 0
  }
  // Untracked inventory — treat as available unless archived elsewhere.
  return true
}

/**
 * New Arrivals rule (deterministic) — only products customers can buy today:
 * - effective storefront status is exactly `instock`
 * - retail `price` is a finite number (purchasable; excludes Coming Soon)
 * - Shopify product is ACTIVE and available for sale when known
 *
 * Automatically excluded (and left on the next sync):
 * Preorder, Sold Out, Coming Soon (null price), Archived, Draft, unavailable.
 *
 * Documented in docs/SHOPIFY_DATA_STANDARD.md.
 */
export function isNewArrivalProduct(
  product: CollectionAssignableProduct,
  context?: SyncProductContext
): boolean {
  if (product.status !== "instock") return false
  if (product.price == null || !Number.isFinite(product.price)) return false
  if (!isShopifyActiveAndForSale(context)) return false
  return true
}

/**
 * Resolve effective catalog status after the preorder release plan.
 * Does not auto-convert on release date — only on Shopify approval / sticky released.
 */
export function resolveEffectiveSyncStatus(
  product: CollectionAssignableProduct,
  context?: SyncProductContext
): { status: ProductStatus; plan: PreorderReleasePlan } {
  const plan = planPreorderRelease(
    {
      status: product.status,
      title: product.title,
      slug: product.slug,
      releaseDate: product.releaseDate,
    },
    context?.existingTags,
    context?.today
  )
  return { status: plan.effectiveStatus, plan }
}

/**
 * Map an imported catalog product to standard collection keys.
 *
 * Auto-assigned: game/language, accessories, sealed-cases, preorders,
 * coming-soon, and new-arrivals (see `isNewArrivalProduct`).
 * Merchandising-only homepage collections (Featured, Best Sellers, Sale)
 * are not auto-assigned.
 *
 * Pass sync context on updates so approved releases leave `preorders`,
 * join `new-arrivals` when purchasable, and leave when sold out / archived.
 */
export function resolveProductCollectionKeys(
  product: CollectionAssignableProduct,
  context?: SyncProductContext
): string[] {
  const { status } = resolveEffectiveSyncStatus(product, context)
  const effective = { ...product, status }

  const keys = new Set<string>()
  const language = resolveProductLanguage(effective)
  const accessory = isAccessoryTitle(effective.title)

  if (accessory) {
    keys.add("accessories")
  }

  if (isSealedCaseTitle(effective.title)) {
    keys.add("sealed-cases")
  }

  if (isPokemonCategory(effective.category)) {
    keys.add("pokemon")
    keys.add(`pokemon-${language}`)
  } else if (isOnePieceCategory(effective.category)) {
    keys.add("one-piece")
    if (language === "japanese" || language === "english") {
      keys.add(`one-piece-${language}`)
    }
  }

  if (status === "preorder") {
    keys.add("preorders")
  }

  if (effective.price == null && status !== "soldout") {
    keys.add("coming-soon")
  }

  if (isNewArrivalProduct(effective, context)) {
    keys.add("new-arrivals")
  }

  return [...keys].filter((key) => getStandardCollection(key) != null)
}

function handlesFor(spec: StandardCollection): string[] {
  const handles = [spec.handle, ...(spec.handleAliases ?? [])]
  return [...new Set(handles.map((h) => h.trim()).filter(Boolean))]
}

async function lookupCollectionByHandle(
  handle: string
): Promise<{ id: string; handle: string; title: string } | null> {
  const data = await shopifyAdminFetch<CollectionLookupResult>({
    query: COLLECTION_BY_HANDLE,
    variables: { handle },
  })
  return data.collectionByIdentifier
}

async function lookupCollectionByTitle(
  title: string
): Promise<{ id: string; handle: string; title: string } | null> {
  // Prefer exact title match via Admin search syntax.
  const exact = await shopifyAdminFetch<CollectionsSearchResult>({
    query: COLLECTIONS_SEARCH,
    variables: {
      query: `title:'${title.replace(/'/g, "\\'")}'`,
      first: 10,
    },
  })

  const exactNormalized = normalizeCollectionLabel(title)
  const exactHit = exact.collections.nodes.find(
    (node) => normalizeCollectionLabel(node.title) === exactNormalized
  )
  if (exactHit) return exactHit

  // Broader title search, then normalize-compare (handles Pokémon vs Pokemon).
  const loose = await shopifyAdminFetch<CollectionsSearchResult>({
    query: COLLECTIONS_SEARCH,
    variables: {
      query: `title:${title.replace(/[:\\]/g, " ")}`,
      first: 25,
    },
  })

  return (
    loose.collections.nodes.find(
      (node) => normalizeCollectionLabel(node.title) === exactNormalized
    ) ?? null
  )
}

/**
 * Find an existing Shopify collection for a standard entry.
 * Tries handles first, then title/name. Does not create.
 */
export async function findStandardCollectionInShopify(
  spec: StandardCollection,
  cache?: CollectionResolverCache
): Promise<string | null> {
  const cacheKey = spec.key
  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey) ?? null
  }

  let resolved: string | null = null

  for (const handle of handlesFor(spec)) {
    const byHandle = await lookupCollectionByHandle(handle)
    if (byHandle) {
      resolved = byHandle.id
      break
    }
  }

  if (!resolved) {
    const byTitle = await lookupCollectionByTitle(spec.title)
    if (byTitle) {
      resolved = byTitle.id
    }
  }

  cache?.set(cacheKey, resolved)
  return resolved
}

/**
 * Publish a collection to the Headless sales channel (best-effort).
 * Newly created collections are unpublished by default.
 */
async function ensureCollectionPublishedToHeadless(
  collectionId: string,
  options?: { dryRun?: boolean }
): Promise<void> {
  const dryRun = isShopifyDryRun(options)
  const publications = await getHeadlessPublications()
  if (publications.length === 0) return

  try {
    const unpublished: HeadlessPublication[] = []
    for (const publication of publications) {
      const data = await shopifyAdminFetch<CollectionPublishedOnResult>({
        query: COLLECTION_PUBLISHED_ON,
        variables: { id: collectionId, publicationId: publication.id },
      })
      if (!data.collection?.publishedOnPublication) {
        unpublished.push(publication)
      }
    }

    if (unpublished.length === 0) return

    if (dryRun) {
      console.log(
        `  [DRY_RUN] Would publish collection to Headless: ${unpublished
          .map((p) => p.name)
          .join(", ")}`
      )
      return
    }

    const data = await shopifyAdminFetch<PublishablePublishResult>({
      query: PUBLISHABLE_PUBLISH,
      variables: {
        id: collectionId,
        input: unpublished.map((publication) => ({
          publicationId: publication.id,
        })),
      },
    })

    const errors = data.publishablePublish.userErrors
    if (errors.length > 0) {
      console.warn(
        `  Warning: collection Headless publish failed for ${collectionId}: ${errors
          .map((e) => e.message)
          .join("; ")}`
      )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(
      `  Warning: collection Headless publish failed for ${collectionId}: ${message}`
    )
  }
}

async function createStandardCollection(
  spec: StandardCollection
): Promise<{ id: string; handle: string; title: string }> {
  const data = await shopifyAdminFetch<CollectionCreateResult>({
    query: COLLECTION_CREATE,
    variables: {
      input: {
        title: spec.title,
        handle: spec.handle,
      },
    },
  })

  const errors = data.collectionCreate.userErrors
  if (errors.length > 0) {
    throw new Error(
      `collectionCreate(${spec.handle}) failed: ${errors
        .map((e) => e.message)
        .join("; ")}`
    )
  }

  const collection = data.collectionCreate.collection
  if (!collection?.id) {
    throw new Error(
      `collectionCreate(${spec.handle}) returned no collection id`
    )
  }

  await ensureCollectionPublishedToHeadless(collection.id)
  return collection
}

/**
 * Resolve a standard collection GID, creating the Shopify collection when
 * no handle/title match exists. Caches both hits and creates for the run.
 */
export async function ensureStandardCollectionInShopify(
  spec: StandardCollection,
  options?: { cache?: CollectionResolverCache; dryRun?: boolean }
): Promise<string | null> {
  const cache = options?.cache
  const dryRun = isShopifyDryRun(options)

  // Peek cache without treating a prior miss as final — we may create now.
  if (cache?.has(spec.key)) {
    const cached = cache.get(spec.key) ?? null
    if (cached) return cached
  }

  const existing = await findStandardCollectionInShopify(spec)
  if (existing) {
    cache?.set(spec.key, existing)
    return existing
  }

  if (dryRun) {
    console.log(
      `  [DRY_RUN] Would create collection: ${spec.title} (${spec.handle})`
    )
    // Synthetic id so assignment dry-runs can still report membership joins.
    const dryId = `dry-run://collection/${spec.handle}`
    cache?.set(spec.key, dryId)
    return dryId
  }

  const created = await createStandardCollection(spec)
  console.log(`  Created collection: ${spec.title} (${created.handle})`)
  cache?.set(spec.key, created.id)
  return created.id
}

/**
 * Ensure every standard collection exists in Shopify (create if missing).
 * Call once before product sync so language/homepage collections exist even
 * when no product in the batch maps to them yet.
 */
export async function ensureStandardCollections(options?: {
  cache?: CollectionResolverCache
  dryRun?: boolean
}): Promise<EnsureStandardCollectionsResult> {
  const dryRun = isShopifyDryRun(options)
  const cache = options?.cache ?? new Map()
  const ensured: EnsureStandardCollectionsResult["ensured"] = []

  console.log(
    dryRun
      ? "\n=== Ensuring standard collections (DRY_RUN) ==="
      : "\n=== Ensuring standard collections ==="
  )

  for (const spec of STANDARD_COLLECTIONS) {
    // Clear a prior miss so ensure can create.
    if (cache.has(spec.key) && cache.get(spec.key) == null) {
      cache.delete(spec.key)
    }

    const cachedId = cache.get(spec.key) ?? null
    if (cachedId) {
      ensured.push({ key: spec.key, id: cachedId, created: false })
      continue
    }

    const existing = await findStandardCollectionInShopify(spec)
    if (existing) {
      cache.set(spec.key, existing)
      ensured.push({ key: spec.key, id: existing, created: false })
      continue
    }

    const id = await ensureStandardCollectionInShopify(spec, {
      cache,
      dryRun,
    })
    if (id) {
      ensured.push({ key: spec.key, id, created: true })
    }
  }

  const createdCount = ensured.filter((e) => e.created).length
  const existingCount = ensured.length - createdCount
  console.log(
    `  Collections: ${existingCount} existing, ${createdCount} ${
      dryRun ? "would create" : "created"
    }`
  )

  return { ensured, dryRun }
}

async function getProductCollectionIds(productId: string): Promise<Set<string>> {
  const data = await shopifyAdminFetch<ProductCollectionsResult>({
    query: PRODUCT_COLLECTIONS,
    variables: { id: productId },
  })

  const ids = data.product?.collections.nodes.map((node) => node.id) ?? []
  return new Set(ids)
}

/**
 * Assign a Shopify product to the standard collections it should belong to.
 *
 * - Resolves collections by handle/name; creates missing ones automatically
 * - Skips collections the product already belongs to (no duplicates)
 * - For sync-owned collections (new-arrivals, preorders), leaves membership when
 *   the product no longer qualifies
 */
export async function assignCollections(
  productId: string,
  collectionKeys: string[],
  options?: { cache?: CollectionResolverCache; dryRun?: boolean }
): Promise<AssignCollectionsResult> {
  const uniqueKeys = [...new Set(collectionKeys)]
  const desired = new Set(uniqueKeys)
  const cache = options?.cache ?? new Map()
  const dryRun = isShopifyDryRun(options)

  const joined: string[] = []
  const left: string[] = []
  const alreadyMember: string[] = []
  const missing: string[] = []
  const toJoin: string[] = []
  const toLeave: string[] = []

  // Membership lookup is a read — allowed in DRY_RUN when we have a real product GID.
  const current =
    dryRun && !productId.startsWith("gid://")
      ? new Set<string>()
      : await getProductCollectionIds(productId)

  for (const key of uniqueKeys) {
    const spec = getStandardCollection(key)
    if (!spec) {
      missing.push(key)
      continue
    }

    // Clear a prior miss so ensure can create this run.
    if (cache.has(key) && cache.get(key) == null) {
      cache.delete(key)
    }

    const collectionId = await ensureStandardCollectionInShopify(spec, {
      cache,
      dryRun,
    })
    if (!collectionId) {
      missing.push(key)
      continue
    }

    if (current.has(collectionId)) {
      alreadyMember.push(collectionId)
      continue
    }

    toJoin.push(collectionId)
  }

  // Leave sync-owned collections the product no longer qualifies for.
  for (const key of SYNC_OWNED_COLLECTION_KEYS) {
    if (desired.has(key)) continue

    const spec = getStandardCollection(key)
    if (!spec) continue

    // Do not create a collection solely to leave it — lookup only.
    if (cache.has(key) && cache.get(key) == null) {
      cache.delete(key)
    }
    const collectionId = await findStandardCollectionInShopify(spec, cache)
    if (!collectionId || collectionId.startsWith("dry-run://")) continue
    if (!current.has(collectionId)) continue

    toLeave.push(collectionId)
  }

  if ((toJoin.length > 0 || toLeave.length > 0) && !dryRun) {
    const data = await shopifyAdminFetch<ProductUpdateResult>({
      query: PRODUCT_JOIN_COLLECTIONS,
      variables: {
        product: {
          id: productId,
          ...(toJoin.length > 0 ? { collectionsToJoin: toJoin } : {}),
          ...(toLeave.length > 0 ? { collectionsToLeave: toLeave } : {}),
        },
      },
    })

    const errors = data.productUpdate.userErrors
    if (errors.length > 0) {
      throw new Error(
        `assignCollections failed for ${productId}: ${errors
          .map((e) => e.message)
          .join("; ")}`
      )
    }

    joined.push(...toJoin)
    left.push(...toLeave)
  } else if (dryRun) {
    joined.push(...toJoin)
    left.push(...toLeave)
  }

  return {
    productId,
    requested: uniqueKeys,
    joined,
    left,
    alreadyMember,
    missing,
  }
}

/**
 * Resolve standard keys for a product, then assign against Shopify.
 * Creates any missing standard collections first.
 */
export async function assignProductToStandardCollections(
  productId: string,
  product: CollectionAssignableProduct,
  options?: {
    cache?: CollectionResolverCache
    dryRun?: boolean
    existingTags?: string[]
    today?: string
    shopifyProductStatus?: string
    availableForSale?: boolean
  }
): Promise<AssignCollectionsResult> {
  const keys = resolveProductCollectionKeys(product, {
    existingTags: options?.existingTags,
    today: options?.today,
    shopifyProductStatus: options?.shopifyProductStatus,
    availableForSale: options?.availableForSale,
  })
  return assignCollections(productId, keys, options)
}

/** All standard collection definitions (for tests / tooling). */
export { STANDARD_COLLECTIONS }

// ---------------------------------------------------------------------------
// Product sync
// ---------------------------------------------------------------------------

/**
 * Whether Admin mutations should be skipped.
 * True when `{ dryRun: true }`, `DRY_RUN`/`SHOPIFY_DRY_RUN` is truthy, or `--dry-run`.
 */
export function isShopifyDryRun(options?: { dryRun?: boolean }): boolean {
  if (options?.dryRun != null) return options.dryRun

  const env = (
    process.env.DRY_RUN ??
    process.env.SHOPIFY_DRY_RUN ??
    ""
  ).trim()
  if (/^(1|true|yes)$/i.test(env)) return true

  return process.argv.includes("--dry-run")
}

function asProductLike(product: SyncableProduct): Product {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    category: product.category,
    image: product.image ?? "",
    price: product.price,
    url: `/products/${product.slug}`,
    status: product.status,
    releaseDate: product.releaseDate,
  }
}

function resolveShopifyProductType(product: SyncableProduct): string {
  const label = getProductTypeLabel(asProductLike(product))

  switch (label) {
    case "Booster Box":
      return "Booster Box"
    case "Starter Set":
    case "Deck Set":
      return "Starter Deck"
    case "Premium Collection":
    case "Card Set":
    case "Promo":
      return "Premium Collection"
    case "Binder":
      return "Binder"
    case "Booster Case":
      return "Case"
    default:
      return label
  }
}

function resolveVendor(product: SyncableProduct): string {
  return getProductBrand(asProductLike(product)) ?? "Swift TCG"
}

function resolveSetCodeTag(title: string): string | null {
  const bracket = title.match(/\[([A-Z0-9-]+)\]/i)
  if (bracket?.[1]) return bracket[1].toLowerCase()
  return null
}

/**
 * Tags for organization / storefront status mapping.
 *
 * Hybrid release workflow tags (`ready-to-release`, `released`) are internal.
 * Storefront availability still follows `preorder` / inventory — never flip to
 * in-stock solely because the release date passed.
 */
export function buildProductTags(
  product: SyncableProduct,
  context?: SyncProductContext
): string[] {
  const { status, plan } = resolveEffectiveSyncStatus(product, context)
  const effective: SyncableProduct = { ...product, status }

  const tags = new Set<string>()
  tags.add("sora")

  if (isPokemonCategory(effective.category)) tags.add("pokemon")
  if (isOnePieceCategory(effective.category)) tags.add("one-piece")

  tags.add(resolveProductLanguage(effective))

  if (status === "preorder") tags.add("preorder")
  if (status === "soldout") tags.add("soldout")
  if (effective.price == null && status !== "soldout") {
    tags.add("coming-soon")
  }

  const setCode = resolveSetCodeTag(effective.title)
  if (setCode) tags.add(setCode)

  const typeFilter = getProductTypeFilter(asProductLike(effective))
  if (typeFilter === "booster-boxes") tags.add("booster-box")
  if (typeFilter === "starter-decks") tags.add("starter-deck")
  if (typeFilter === "premium-collections") tags.add("premium")
  if (typeFilter === "accessories") tags.add("accessories")
  if (typeFilter === "cases") tags.add("case")

  applyReleaseWorkflowTags(tags, plan)

  return [...tags]
}

function formatPrice(price: number | null): string {
  if (price == null || !Number.isFinite(price)) return "0.00"
  return price.toFixed(2)
}

function resolveImageSource(product: SyncableProduct): string | null {
  const remote = product.imageUrl?.trim()
  if (remote && /^https?:\/\//i.test(remote)) return remote
  return null
}

function throwUserErrors(context: string, errors: AdminUserError[]): void {
  if (errors.length === 0) return
  throw new Error(
    `${context}: ${errors.map((e) => e.message).join("; ")}`
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type ExistingShopifyProduct = NonNullable<
  ExistingProductResult["productByIdentifier"]
>

/** Look up a Shopify product by handle. Returns null when missing. */
export async function findProductByHandle(
  handle: string
): Promise<ExistingShopifyProduct | null> {
  const data = await shopifyAdminFetch<ExistingProductResult>({
    query: PRODUCT_BY_HANDLE,
    variables: { handle },
  })
  return data.productByIdentifier
}

type ProductFieldInput = {
  title: string
  handle: string
  vendor: string
  productType: string
  tags: string[]
}

/**
 * Catalog-owned product fields written to Shopify.
 * Merchandising owned by Shopify (not written on create/update): product
 * description body, selling price, compare-at price, product status, SEO.
 */
function buildProductFields(
  product: SyncableProduct,
  context?: SyncProductContext
): ProductFieldInput {
  return {
    title: product.title,
    handle: product.slug,
    vendor: resolveVendor(product),
    productType: resolveShopifyProductType(product),
    tags: buildProductTags(product, context),
  }
}

function mediaInput(product: SyncableProduct): Array<{
  originalSource: string
  alt: string
  mediaContentType: "IMAGE"
}> {
  const source = resolveImageSource(product)
  if (!source) return []
  return [
    {
      originalSource: source,
      alt: product.title,
      mediaContentType: "IMAGE",
    },
  ]
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => normalizeComparableText(t)).filter(Boolean))].sort()
}

function tagsEqual(a: string[], b: string[]): boolean {
  const left = normalizeTags(a)
  const right = normalizeTags(b)
  if (left.length !== right.length) return false
  return left.every((tag, i) => tag === right[i])
}

function desiredImageUrls(product: SyncableProduct): string[] {
  return mediaInput(product).map((m) => m.originalSource)
}

/**
 * Image upload is needed only when local has a source and Shopify has no media.
 * Shopify CDN rehosting means absolute URL equality is not a reliable signal.
 */
function needsImageUpload(
  existing: ExistingShopifyProduct,
  product: SyncableProduct
): boolean {
  const desired = desiredImageUrls(product)
  if (desired.length === 0) return false
  return existing.media.nodes.length === 0
}

export type ProductChangeDiff = {
  /** True when a mutation is required. */
  changed: boolean
  /** Product fields that require productUpdate (catalog-owned only). */
  fieldsChanged: boolean
  /** True when image upload should run. */
  imagesNeedUpload: boolean
  /** True when collection membership should be joined. */
  collectionsNeedUpdate: boolean
  /** Human-readable change reasons for logging. */
  reasons: string[]
}

/**
 * Diff local catalog product vs Shopify product for idempotent sync.
 * Synced fields: title, handle, vendor, product type, tags, images
 * (upload-needed), collections. Availability is expressed via tags.
 *
 * Shopify-owned (ignored for updates + idempotency): product description
 * body, selling price, compare-at price, product status, SEO title,
 * SEO description.
 */
export function diffProductChanges(
  existing: ExistingShopifyProduct,
  product: SyncableProduct,
  collectionPreview: Pick<AssignCollectionsResult, "joined" | "left">,
  context?: SyncProductContext
): ProductChangeDiff {
  const syncContext: SyncProductContext = {
    existingTags: context?.existingTags ?? existing.tags,
    today: context?.today,
    shopifyProductStatus:
      context?.shopifyProductStatus ?? existing.status,
    availableForSale:
      context?.availableForSale ?? resolveShopifyAvailableForSale(existing),
  }
  const fields = buildProductFields(product, syncContext)
  const reasons: string[] = []

  if (normalizeComparableText(existing.title) !== normalizeComparableText(fields.title)) {
    reasons.push(
      `Title changed (${existing.title || "∅"} → ${fields.title || "∅"})`
    )
  }

  if (normalizeComparableText(existing.handle) !== normalizeComparableText(fields.handle)) {
    reasons.push(
      `Handle changed (${existing.handle || "∅"} → ${fields.handle || "∅"})`
    )
  }

  if (normalizeComparableText(existing.vendor) !== normalizeComparableText(fields.vendor)) {
    reasons.push(
      `Vendor changed (${existing.vendor || "∅"} → ${fields.vendor || "∅"})`
    )
  }

  if (
    normalizeComparableText(existing.productType) !==
    normalizeComparableText(fields.productType)
  ) {
    reasons.push(
      `Product Type changed (${existing.productType || "∅"} → ${fields.productType || "∅"})`
    )
  }

  if (!tagsEqual(existing.tags ?? [], fields.tags)) {
    const before = normalizeTags(existing.tags ?? []).join(", ") || "∅"
    const after = normalizeTags(fields.tags).join(", ") || "∅"
    reasons.push(`Tags changed ([${before}] → [${after}])`)
  }

  const fieldsChanged = reasons.length > 0

  const imagesNeedUpload = needsImageUpload(existing, product)
  if (imagesNeedUpload) {
    reasons.push("Images changed (missing on Shopify)")
  }

  const joinCount = collectionPreview.joined.length
  const leaveCount = collectionPreview.left.length
  const collectionsNeedUpdate = joinCount > 0 || leaveCount > 0
  if (collectionsNeedUpdate) {
    const parts: string[] = []
    if (joinCount > 0) parts.push(`+${joinCount} to join`)
    if (leaveCount > 0) parts.push(`-${leaveCount} to leave`)
    reasons.push(`Collections changed (${parts.join(", ")})`)
  }

  return {
    changed: fieldsChanged || imagesNeedUpload || collectionsNeedUpdate,
    fieldsChanged,
    imagesNeedUpload,
    collectionsNeedUpdate,
    reasons,
  }
}

function logUpdateReasons(handle: string, reasons: string[], dryRun: boolean): void {
  const prefix = dryRun ? "[DRY_RUN] Would update" : "UPDATE"
  console.log(`  ${prefix} ${handle}`)
  console.log("  Reason:")
  for (const reason of reasons) {
    console.log(`  - ${reason}`)
  }
}

function publicationLabel(node: PublicationNode): string {
  return (node.name || node.catalog?.title || node.id).trim()
}

function publicationParts(node: PublicationNode): Array<string | null | undefined> {
  return [
    node.name,
    node.catalog?.title,
    ...(node.catalog?.apps?.nodes ?? []).flatMap((app) => [
      app.title,
      app.handle,
    ]),
  ]
}

/**
 * Headless sales channels are APP publications whose name/app mentions
 * Headless (e.g. "Swift Tcg Headless", app handle `headless-storefronts`).
 */
function isHeadlessPublication(node: PublicationNode): boolean {
  return publicationParts(node).some((part) => /headless/i.test(part ?? ""))
}

/**
 * Shop sales channel — Shopify's Shop app (title/handle "Shop"), not Online Store
 * and not Headless.
 */
function isShopPublication(node: PublicationNode): boolean {
  if (isHeadlessPublication(node)) return false

  const apps = node.catalog?.apps?.nodes ?? []
  if (
    apps.some(
      (app) =>
        /^shop$/i.test((app.handle ?? "").trim()) ||
        /^shop$/i.test((app.title ?? "").trim())
    )
  ) {
    return true
  }

  return /^shop$/i.test((node.name ?? "").trim())
}

async function listPublications(
  catalogType: "APP" | null
): Promise<PublicationNode[]> {
  try {
    const data = await shopifyAdminFetch<PublicationsResult>({
      query: PUBLICATIONS,
      variables: { catalogType },
    })
    return data.publications.nodes
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(
      `  Warning: could not list publications` +
        (catalogType ? ` (${catalogType})` : "") +
        `: ${message}`
    )
    return []
  }
}

/**
 * Resolve Headless publication targets (cached for the process).
 * Prefers catalogType APP (includes Headless even when the unfiltered list
 * omits it on some shops). Falls back to the unfiltered publications list.
 */
async function getHeadlessPublications(): Promise<HeadlessPublication[]> {
  if (cachedHeadlessPublications) return cachedHeadlessPublications

  const appNodes = await listPublications("APP")
  let headless = appNodes.filter(isHeadlessPublication).map((node) => ({
    id: node.id,
    name: publicationLabel(node),
  }))

  if (headless.length === 0) {
    const allNodes = await listPublications(null)
    headless = allNodes.filter(isHeadlessPublication).map((node) => ({
      id: node.id,
      name: publicationLabel(node),
    }))
  }

  if (headless.length === 0) {
    console.warn(
      "  Warning: no Headless sales channel publication found — " +
        "products may stay unavailable on the Storefront API. " +
        "Install/configure the Headless channel and ensure " +
        "read_publications + write_publications scopes."
    )
  }

  cachedHeadlessPublications = headless
  return cachedHeadlessPublications
}

/**
 * Resolve Shop sales-channel publication targets (cached for the process).
 * Prefers catalogType APP; falls back to the unfiltered publications list.
 */
async function getShopPublications(): Promise<ShopPublication[]> {
  if (cachedShopPublications) return cachedShopPublications

  const appNodes = await listPublications("APP")
  let shop = appNodes.filter(isShopPublication).map((node) => ({
    id: node.id,
    name: publicationLabel(node),
  }))

  if (shop.length === 0) {
    const allNodes = await listPublications(null)
    shop = allNodes.filter(isShopPublication).map((node) => ({
      id: node.id,
      name: publicationLabel(node),
    }))
  }

  if (shop.length === 0) {
    console.warn(
      "  Warning: no Shop sales channel publication found — " +
        "products may stay unavailable on Shop. " +
        "Install/configure the Shop channel and ensure " +
        "read_publications + write_publications scopes."
    )
  }

  cachedShopPublications = shop
  return cachedShopPublications
}

async function isPublishedOnPublication(
  productId: string,
  publicationId: string
): Promise<boolean> {
  const data = await shopifyAdminFetch<ProductPublishedOnResult>({
    query: PRODUCT_PUBLISHED_ON,
    variables: { id: productId, publicationId },
  })
  return Boolean(data.product?.publishedOnPublication)
}

function logHeadlessPublishStatus(
  status: HeadlessPublishStatus,
  labels: string[],
  dryRun: boolean
): void {
  const channel =
    labels.length > 0 ? labels.join(", ") : "Headless"
  const prefix = dryRun ? "[DRY_RUN] " : ""

  switch (status) {
    case "already_published":
      console.log(`  ${prefix}Already published to Headless: ${channel}`)
      break
    case "published":
      console.log(`  ${prefix}Published to Headless: ${channel}`)
      break
    case "unavailable":
      console.warn(
        `  ${prefix}Warning: Headless publication unavailable — skipped publish`
      )
      break
    case "failed":
      // Detailed warning already logged by ensurePublishedToHeadless.
      break
  }
}

function logShopPublishStatus(
  status: ShopPublishStatus,
  labels: string[],
  dryRun: boolean
): void {
  const channel = labels.length > 0 ? labels.join(", ") : "Shop"
  const prefix = dryRun ? "[DRY_RUN] " : ""

  switch (status) {
    case "already_published":
      console.log(`  ${prefix}Already published to Shop: ${channel}`)
      break
    case "published":
      console.log(`  ${prefix}Published to Shop: ${channel}`)
      break
    case "unavailable":
      console.warn(
        `  ${prefix}Warning: Shop publication unavailable — skipped publish`
      )
      break
    case "failed":
      // Detailed warning already logged by ensurePublishedToShop.
      break
  }
}

/**
 * Ensure a product is published to the Headless sales channel.
 * Idempotent: already-published products are left as-is.
 * Best-effort: missing scopes / empty publication list will not fail the sync.
 */
export async function ensurePublishedToHeadless(
  productId: string,
  options?: { dryRun?: boolean }
): Promise<{ status: HeadlessPublishStatus; publications: string[] }> {
  const dryRun = isShopifyDryRun(options)
  const publications = await getHeadlessPublications()

  if (publications.length === 0) {
    const status: HeadlessPublishStatus = "unavailable"
    logHeadlessPublishStatus(status, [], dryRun)
    return { status, publications: [] }
  }

  const labels = publications.map((p) => p.name)

  try {
    const unpublished: HeadlessPublication[] = []
    for (const publication of publications) {
      const already = await isPublishedOnPublication(
        productId,
        publication.id
      )
      if (!already) unpublished.push(publication)
    }

    if (unpublished.length === 0) {
      const status: HeadlessPublishStatus = "already_published"
      logHeadlessPublishStatus(status, labels, dryRun)
      return { status, publications: labels }
    }

    if (dryRun) {
      const status: HeadlessPublishStatus = "published"
      logHeadlessPublishStatus(
        status,
        unpublished.map((p) => p.name),
        true
      )
      return { status, publications: labels }
    }

    const data = await shopifyAdminFetch<PublishablePublishResult>({
      query: PUBLISHABLE_PUBLISH,
      variables: {
        id: productId,
        input: unpublished.map((publication) => ({
          publicationId: publication.id,
        })),
      },
    })

    const errors = data.publishablePublish.userErrors
    if (errors.length > 0) {
      console.warn(
        `  Warning: Headless publish failed for ${productId}: ${errors
          .map((e) => e.message)
          .join("; ")}`
      )
      return { status: "failed", publications: labels }
    }

    const status: HeadlessPublishStatus = "published"
    logHeadlessPublishStatus(
      status,
      unpublished.map((p) => p.name),
      false
    )
    return { status, publications: labels }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(
      `  Warning: Headless publish failed for ${productId}: ${message}`
    )
    return { status: "failed", publications: labels }
  }
}

/**
 * Ensure a product is published to the Shop sales channel.
 * Idempotent: already-published products are left as-is.
 * Best-effort: missing scopes / empty publication list will not fail the sync.
 */
export async function ensurePublishedToShop(
  productId: string,
  options?: { dryRun?: boolean }
): Promise<{ status: ShopPublishStatus; publications: string[] }> {
  const dryRun = isShopifyDryRun(options)
  const publications = await getShopPublications()

  if (publications.length === 0) {
    const status: ShopPublishStatus = "unavailable"
    logShopPublishStatus(status, [], dryRun)
    return { status, publications: [] }
  }

  const labels = publications.map((p) => p.name)

  try {
    const unpublished: ShopPublication[] = []
    for (const publication of publications) {
      const already = await isPublishedOnPublication(
        productId,
        publication.id
      )
      if (!already) unpublished.push(publication)
    }

    if (unpublished.length === 0) {
      const status: ShopPublishStatus = "already_published"
      logShopPublishStatus(status, labels, dryRun)
      return { status, publications: labels }
    }

    if (dryRun) {
      const status: ShopPublishStatus = "published"
      logShopPublishStatus(
        status,
        unpublished.map((p) => p.name),
        true
      )
      return { status, publications: labels }
    }

    const data = await shopifyAdminFetch<PublishablePublishResult>({
      query: PUBLISHABLE_PUBLISH,
      variables: {
        id: productId,
        input: unpublished.map((publication) => ({
          publicationId: publication.id,
        })),
      },
    })

    const errors = data.publishablePublish.userErrors
    if (errors.length > 0) {
      console.warn(
        `  Warning: Shop publish failed for ${productId}: ${errors
          .map((e) => e.message)
          .join("; ")}`
      )
      return { status: "failed", publications: labels }
    }

    const status: ShopPublishStatus = "published"
    logShopPublishStatus(
      status,
      unpublished.map((p) => p.name),
      false
    )
    return { status, publications: labels }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(
      `  Warning: Shop publish failed for ${productId}: ${message}`
    )
    return { status: "failed", publications: labels }
  }
}

/**
 * Publish to Headless then Shop. Headless behavior is unchanged; Shop is additive.
 */
async function ensurePublishedToSalesChannels(
  productId: string,
  options?: { dryRun?: boolean }
): Promise<{
  headless: Awaited<ReturnType<typeof ensurePublishedToHeadless>>
  shop: Awaited<ReturnType<typeof ensurePublishedToShop>>
}> {
  const headless = await ensurePublishedToHeadless(productId, options)
  const shop = await ensurePublishedToShop(productId, options)
  return { headless, shop }
}

/**
 * Set variant price + SKU for a newly created product only.
 * Selling / compare-at prices are Shopify-owned after create — never overwrite on update.
 */
async function setInitialVariantPriceAndSku(
  productId: string,
  variantId: string,
  product: SyncableProduct
): Promise<void> {
  const data = await shopifyAdminFetch<ProductVariantsBulkUpdateResult>({
    query: PRODUCT_VARIANTS_BULK_UPDATE,
    variables: {
      productId,
      variants: [
        {
          id: variantId,
          price: formatPrice(product.price),
          inventoryItem: {
            sku: product.id,
          },
        },
      ],
    },
  })
  throwUserErrors(
    `productVariantsBulkUpdate(${productId})`,
    data.productVariantsBulkUpdate.userErrors
  )
}

/**
 * Create a new Shopify product (matched later by handle).
 * Seeds title, vendor, type, tags, handle, media, and an initial selling price.
 * Product description is left empty for Shopify Admin editing.
 * Status defaults to ACTIVE on create only — later imports never overwrite
 * description, price, compare-at, status, or SEO.
 * Caller should call `ensurePublishedToHeadless` / `ensurePublishedToShop`
 * (via `ensurePublishedToSalesChannels`) after create.
 */
export async function createProduct(
  product: SyncableProduct,
  options?: { dryRun?: boolean; today?: string }
): Promise<{ productId: string; handle: string }> {
  const fields = buildProductFields(product, { today: options?.today })
  const media = mediaInput(product)

  if (isShopifyDryRun(options)) {
    return { productId: `dry-run://product/${fields.handle}`, handle: fields.handle }
  }

  const data = await shopifyAdminFetch<ProductCreateMutationResult>({
    query: PRODUCT_CREATE,
    variables: {
      product: {
        ...fields,
        // Initial status only — never updated on subsequent syncs.
        status: "ACTIVE",
      },
      media: media.length > 0 ? media : undefined,
    },
  })

  throwUserErrors(
    `productCreate(${fields.handle})`,
    data.productCreate.userErrors
  )

  const created = data.productCreate.product
  if (!created) {
    throw new Error(`productCreate(${fields.handle}) returned no product`)
  }

  const variantId = created.variants.nodes[0]?.id
  if (variantId) {
    await setInitialVariantPriceAndSku(created.id, variantId, product)
  }

  return { productId: created.id, handle: created.handle }
}

/**
 * Update an existing Shopify product by GID.
 * Syncs title, vendor, type, tags, handle.
 * Does not overwrite description, selling price, compare-at, status, or SEO.
 * Does not remove existing media — call `uploadImages` when media is empty.
 */
export async function updateProduct(
  productId: string,
  product: SyncableProduct,
  options?: {
    dryRun?: boolean
    existingTags?: string[]
    today?: string
  }
): Promise<{ productId: string; handle: string }> {
  const fields = buildProductFields(product, {
    existingTags: options?.existingTags,
    today: options?.today,
  })

  if (isShopifyDryRun(options)) {
    return { productId, handle: fields.handle }
  }

  const data = await shopifyAdminFetch<ProductUpdateResult>({
    query: PRODUCT_UPDATE,
    variables: {
      product: {
        id: productId,
        title: fields.title,
        handle: fields.handle,
        vendor: fields.vendor,
        productType: fields.productType,
        tags: fields.tags,
        // Intentionally omit: descriptionHtml, status, seo — Shopify-owned.
      },
    },
  })

  throwUserErrors(
    `productUpdate(${fields.handle})`,
    data.productUpdate.userErrors
  )

  return { productId, handle: fields.handle }
}

/**
 * Attach remote images to a product when it has no media yet.
 * Skips when media already exists (avoids duplicate images on re-import).
 */
export async function uploadImages(
  productId: string,
  product: SyncableProduct,
  options?: {
    dryRun?: boolean
    /** When known from a prior lookup — avoids an extra fetch. */
    existingMediaCount?: number
  }
): Promise<{ uploaded: number; skipped: boolean }> {
  const media = mediaInput(product)
  if (media.length === 0) {
    return { uploaded: 0, skipped: true }
  }

  let existingCount = options?.existingMediaCount
  if (existingCount == null && !isShopifyDryRun(options)) {
    const existing = await findProductByHandle(product.slug)
    existingCount = existing?.media.nodes.length ?? 0
  }

  if ((existingCount ?? 0) > 0) {
    return { uploaded: 0, skipped: true }
  }

  if (isShopifyDryRun(options)) {
    return { uploaded: media.length, skipped: false }
  }

  const data = await shopifyAdminFetch<ProductAddMediaResult>({
    query: PRODUCT_ADD_MEDIA,
    variables: {
      product: { id: productId },
      media,
    },
  })

  throwUserErrors(
    `uploadImages(${product.slug})`,
    data.productUpdate.userErrors
  )

  return {
    uploaded: media.length,
    skipped: false,
  }
}

function formatSyncPreview(
  product: SyncableProduct,
  context?: SyncProductContext
): string {
  const price =
    product.price == null ? "Coming Soon" : `$${formatPrice(product.price)}`
  const tags = buildProductTags(product, context).join(", ")
  const collections =
    resolveProductCollectionKeys(product, context).join(", ") || "(none)"
  const image = resolveImageSource(product) ? "yes" : "no"
  return (
    `${product.slug} | ${product.title} | ${price} | ` +
    `vendor=${resolveVendor(product)} | type=${resolveShopifyProductType(product)} | ` +
    `image=${image} | tags=[${tags}] | collections=[${collections}]`
  )
}

/**
 * Create or update one product by handle, then assign standard collections.
 * Skips when the product already matches (no Shopify mutations for catalog fields).
 * Always ensures the product is published to the Headless and Shop sales channels.
 *
 * Hybrid preorder release: past release dates get `ready-to-release` without
 * changing storefront availability. Merchant adds `release-approved` in Shopify
 * to convert to in-stock on the next sync (leaves preorders, joins new-arrivals).
 */
export async function syncProduct(
  product: SyncableProduct,
  options?: SyncOptions
): Promise<SyncProductResult> {
  const dryRun = isShopifyDryRun(options)
  const handle = product.slug?.trim()

  if (!handle || !product.title?.trim()) {
    return {
      action: "skipped",
      handle: handle || "(missing-handle)",
      title: product.title || "(missing-title)",
      dryRun,
      error: "Missing handle or title",
    }
  }

  try {
    const existing = await findProductByHandle(handle)

    if (existing) {
      const syncContext: SyncProductContext = {
        existingTags: existing.tags,
        today: options?.today,
        shopifyProductStatus: existing.status,
        availableForSale: resolveShopifyAvailableForSale(existing),
      }
      const collectionOpts = {
        cache: options?.cache,
        existingTags: existing.tags,
        today: options?.today,
        shopifyProductStatus: existing.status,
        availableForSale: resolveShopifyAvailableForSale(existing),
      }
      const collectionPreview = await assignProductToStandardCollections(
        existing.id,
        product,
        {
          ...collectionOpts,
          dryRun: true,
        }
      )
      const diff = diffProductChanges(
        existing,
        product,
        collectionPreview,
        syncContext
      )

      if (!diff.changed) {
        if (dryRun) {
          console.log(
            `  [DRY_RUN] Would skip: ${formatSyncPreview(product, syncContext)}`
          )
        } else {
          console.log(`  Skipped: ${handle}`)
        }

        const publish = await ensurePublishedToSalesChannels(existing.id, {
          dryRun,
        })

        return {
          action: "skipped",
          handle,
          title: product.title,
          productId: existing.id,
          changeReasons: [],
          publishStatus: publish.headless.status,
          shopPublishStatus: publish.shop.status,
          collections: {
            ...collectionPreview,
            joined: [],
            left: [],
          },
          dryRun,
        }
      }

      logUpdateReasons(handle, diff.reasons, dryRun)

      if (dryRun) {
        const publish = await ensurePublishedToSalesChannels(existing.id, {
          dryRun: true,
        })
        return {
          action: "updated",
          handle,
          title: product.title,
          productId: existing.id,
          changeReasons: diff.reasons,
          publishStatus: publish.headless.status,
          shopPublishStatus: publish.shop.status,
          collections: collectionPreview,
          dryRun: true,
        }
      }

      if (diff.fieldsChanged) {
        await updateProduct(existing.id, product, {
          existingTags: existing.tags,
          today: options?.today,
        })
      }

      if (diff.imagesNeedUpload) {
        await uploadImages(existing.id, product, {
          existingMediaCount: existing.media.nodes.length,
        })
      }

      const collections = diff.collectionsNeedUpdate
        ? await assignProductToStandardCollections(existing.id, product, {
            ...collectionOpts,
          })
        : {
            ...collectionPreview,
            joined: [],
            left: [],
          }

      const publish = await ensurePublishedToSalesChannels(existing.id)

      return {
        action: "updated",
        handle,
        title: product.title,
        productId: existing.id,
        changeReasons: diff.reasons,
        publishStatus: publish.headless.status,
        shopPublishStatus: publish.shop.status,
        collections,
        dryRun: false,
      }
    }

    const createContext: SyncProductContext = { today: options?.today }

    if (dryRun) {
      console.log(
        `  [DRY_RUN] Would create: ${formatSyncPreview(product, createContext)}`
      )
      const collections = await assignProductToStandardCollections(
        `dry-run://product/${handle}`,
        product,
        { cache: options?.cache, dryRun: true, today: options?.today }
      )
      console.log(`  [DRY_RUN] Would publish to Headless`)
      console.log(`  [DRY_RUN] Would publish to Shop`)
      return {
        action: "created",
        handle,
        title: product.title,
        publishStatus: "published",
        shopPublishStatus: "published",
        collections,
        dryRun: true,
      }
    }

    const created = await createProduct(product, { today: options?.today })
    const collections = await assignProductToStandardCollections(
      created.productId,
      product,
      { cache: options?.cache, today: options?.today }
    )
    console.log(`  Created: ${formatSyncPreview(product, createContext)}`)
    const publish = await ensurePublishedToSalesChannels(created.productId)

    return {
      action: "created",
      handle,
      title: product.title,
      productId: created.productId,
      publishStatus: publish.headless.status,
      shopPublishStatus: publish.shop.status,
      collections,
      dryRun: false,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`  Failed: ${handle} — ${message}`)
    return {
      action: "failed",
      handle,
      title: product.title,
      error: message,
      dryRun,
    }
  }
}

/**
 * Sync many products sequentially.
 * Does not print the rollup — call `printSyncSummary` when ready.
 * Aborts early on Admin auth failures so one bad credential does not spam
 * a Failed line for every product.
 */
export async function syncProducts(
  products: SyncableProduct[],
  options?: SyncOptions
): Promise<SyncProductsSummary> {
  const dryRun = isShopifyDryRun(options)
  const delayMs = options?.delayMs ?? 250
  const cache = options?.cache ?? new Map()
  const started = Date.now()

  if (dryRun) {
    console.log("\n=== Shopify sync (DRY_RUN — no mutations) ===")
  } else {
    console.log("\n=== Shopify sync ===")
  }

  // Create any missing standard collections before product assignment.
  await ensureStandardCollections({ cache, dryRun })

  const results: SyncProductResult[] = []

  for (let i = 0; i < products.length; i += 1) {
    const result = await syncProduct(products[i], { ...options, cache, dryRun })
    results.push(result)

    if (result.action === "failed" && isAdminAuthFailure(result.error)) {
      const remaining = products.length - i - 1
      if (remaining > 0) {
        console.error(
          `  Aborting Shopify sync after auth failure — marking ${remaining} remaining product(s) as failed.`
        )
        for (let j = i + 1; j < products.length; j += 1) {
          results.push({
            action: "failed",
            handle: products[j].slug,
            title: products[j].title,
            error: result.error,
            dryRun,
          })
        }
      }
      break
    }

    if (i < products.length - 1 && delayMs > 0 && !dryRun) {
      await sleep(delayMs)
    }
  }

  return {
    created: results.filter((r) => r.action === "created").length,
    updated: results.filter((r) => r.action === "updated").length,
    skipped: results.filter((r) => r.action === "skipped").length,
    failed: results.filter((r) => r.action === "failed").length,
    durationMs: Date.now() - started,
    dryRun,
    results,
  }
}

function isAdminAuthFailure(message?: string): boolean {
  if (!message) return false
  return (
    /client credentials/i.test(message) ||
    /SHOPIFY_CLIENT_ID/i.test(message) ||
    /SHOPIFY_CLIENT_SECRET/i.test(message) ||
    /application with api_key/i.test(message) ||
    /application_cannot_be_found/i.test(message) ||
    /shop_not_permitted/i.test(message) ||
    /Access denied/i.test(message) ||
    /access scope/i.test(message) ||
    /missing required scopes/i.test(message)
  )
}

/** Print Created / Updated / Skipped / Failed / Duration. */
export function printSyncSummary(summary: SyncProductsSummary): void {
  const seconds = (summary.durationMs / 1000).toFixed(1)
  const mode = summary.dryRun ? " (DRY_RUN)" : ""

  console.log(`\n========== Shopify sync summary${mode} ==========`)
  console.log(`Created:  ${summary.created}`)
  console.log(`Updated:  ${summary.updated}`)
  console.log(`Skipped:  ${summary.skipped}`)
  console.log(`Failed:   ${summary.failed}`)
  console.log(`Duration: ${seconds}s`)
}
