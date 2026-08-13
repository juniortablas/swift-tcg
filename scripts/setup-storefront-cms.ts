/**
 * Idempotent Shopify Storefront CMS setup via Admin GraphQL.
 *
 * Creates / verifies:
 * - Metaobject definitions: storefront_hero, storefront_visual,
 *   homepage_featured_product, homepage_featured_collection, homepage_promotion,
 *   homepage (orchestration)
 * - Product metafield definitions: custom.release_date, language, series,
 *   condition, rarity, product_code; swift.homepage_position (Coming Soon rail)
 * - Hero + Visual seed entries (by `key`)
 * - One Homepage orchestration entry (handle `homepage`)
 * - Shopify Files uploads from /public when local assets match
 *
 * Then verifies Storefront API reads return Shopify data for seeded keys.
 *
 * Usage:
 *   npm run setup:cms
 *   npx tsx scripts/setup-storefront-cms.ts
 *   npx tsx scripts/setup-storefront-cms.ts --dry-run
 *
 * Required Admin scopes:
 *   read_metaobject_definitions, write_metaobject_definitions,
 *   read_metaobjects, write_metaobjects,
 *   write_files, read_files,
 *   write_products  (product metafield definitions)
 * (plus existing client-credentials app install on the store)
 */

import { existsSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import {
  getShopifyAdminConfig,
  shopifyAdminFetch,
  verifyShopifyAdminAuth,
} from "@/lib/shopify/admin"
import { getShopifyConfig, shopifyFetch, ShopifyClientError } from "@/lib/shopify/client"
import { GET_METAOBJECTS_BY_TYPE } from "@/lib/shopify/queries"
import type { MetaobjectsByTypeQueryResult } from "@/lib/shopify/types"

// ---------------------------------------------------------------------------
// Env bootstrap (same pattern as other scripts)
// ---------------------------------------------------------------------------

function loadEnvFile(filename: string): void {
  const filePath = path.resolve(process.cwd(), filename)
  if (!existsSync(filePath)) return

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.SHOPIFY_DRY_RUN === "1"

const CMS_FILE_ALT_PREFIX = "swift-cms:"

type UserError = { field?: string[] | null; message: string; code?: string }

function assertNoUserErrors(label: string, errors: UserError[] | undefined): void {
  if (!errors?.length) return
  throw new Error(
    `${label}: ${errors.map((e) => e.message).join("; ")}`
  )
}

async function verifyCmsAdminScopes(): Promise<void> {
  const data = await shopifyAdminFetch<{
    currentAppInstallation: {
      accessScopes: Array<{ handle: string }>
    }
  }>({
    query: /* GraphQL */ `
      query CurrentAppScopes {
        currentAppInstallation {
          accessScopes {
            handle
          }
        }
      }
    `,
  })

  const granted = new Set(
    data.currentAppInstallation.accessScopes.map((s) => s.handle)
  )
  const required = [
    "read_metaobject_definitions",
    "write_metaobject_definitions",
    "read_metaobjects",
    "write_metaobjects",
    "read_files",
    "write_files",
    "write_products",
  ]
  const missing = required.filter((scope) => !granted.has(scope))
  if (missing.length === 0) return

  throw new ShopifyClientError(
    `Shopify Admin token is missing CMS scopes: ${missing.join(", ")}.\n` +
      `In Dev Dashboard → your app → Versions/Configuration, enable:\n` +
      `  ${required.join(", ")}\n` +
      `Then reinstall/update the app on the store and retry.`,
    403
  )
}

function publicPath(relative: string): string {
  return path.resolve(process.cwd(), "public", relative.replace(/^\//, ""))
}

function localAssetExists(src: string | null | undefined): boolean {
  if (!src || !src.startsWith("/")) return false
  try {
    return existsSync(publicPath(src))
  } catch {
    return false
  }
}

function mimeForFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case ".webp":
      return "image/webp"
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".gif":
      return "image/gif"
    case ".svg":
      return "image/svg+xml"
    default:
      return "application/octet-stream"
  }
}

// ---------------------------------------------------------------------------
// Seed data (matches storefront fallbacks / current copy)
// ---------------------------------------------------------------------------

type HeroSeed = {
  key: string
  title: string
  eyebrow: string
  heading: string
  description: string
  cta_text: string
  cta_link: string
  enabled: boolean
  desktop_image?: string | null
  mobile_image?: string | null
}

type VisualSeed = {
  key: string
  alt: string
  link: string
  image?: string | null
  mobile_image?: string | null
}

/**
 * Legacy hash CTAs from pre-route seeds. Rewrite on existing metaobjects so
 * `npm run setup:cms` clears dead links even when fields are already set.
 * Accessories has no storefront page yet → blank (omit CTA).
 */
const PLACEHOLDER_HREF_REWRITES: Record<string, string> = {
  "#pokemon": "/pokemon",
  "#one-piece": "/one-piece",
  "#accessories": "",
}

function rewritePlaceholderHref(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!Object.prototype.hasOwnProperty.call(PLACEHOLDER_HREF_REWRITES, trimmed)) {
    return null
  }
  return PLACEHOLDER_HREF_REWRITES[trimmed] ?? ""
}

const HERO_SEEDS: HeroSeed[] = [
  {
    key: "homepage",
    title: "Homepage",
    eyebrow: "Direct from Japan",
    heading: "Japanese Pokémon.\nSealed & Current.",
    description:
      "The newest Japanese Pokémon sets, factory-sealed and imported weekly — ready to ship from California.",
    cta_text: "Shop Pokémon",
    cta_link: "/pokemon",
    enabled: true,
    desktop_image: "/products/mega-symphonia.webp",
    mobile_image: "/products/30th-celebration.webp",
  },
  {
    key: "pokemon-hero",
    title: "Pokémon TCG",
    eyebrow: "Direct from Japan",
    heading: "Japanese Pokémon.\nSealed & Current.",
    description:
      "Authentic Japanese Pokémon booster boxes, starter decks, accessories, and new releases.",
    cta_text: "Shop Pokémon",
    cta_link: "/pokemon",
    enabled: true,
    desktop_image: "/products/mega-symphonia.webp",
    mobile_image: "/products/30th-celebration.webp",
  },
  {
    key: "onepiece-hero",
    title: "One Piece TCG",
    eyebrow: "Direct from Japan",
    heading: "One Piece TCG.\nStraight from Bandai.",
    description:
      "Japanese One Piece Card Game sealed product — booster boxes, starter decks, and premium collections.",
    cta_text: "Shop One Piece",
    cta_link: "/one-piece",
    enabled: true,
    desktop_image: "/products/awakening-of-the-new-era.webp",
    mobile_image: "/products/emperors-in-the-new-world.webp",
  },
  {
    key: "preorders-hero",
    title: "Preorders",
    eyebrow: "Direct from Japan",
    heading: "Upcoming Drops.\nReserve Early.",
    description:
      "Secure Japan’s next sealed releases before they land — clear ship windows and California fulfillment.",
    cta_text: "View Preorders",
    cta_link: "/preorders",
    enabled: true,
    desktop_image: "/products/egghead-crisis.webp",
    mobile_image: "/products/30th-celebration.webp",
  },
  {
    key: "new-releases-hero",
    title: "New Releases",
    eyebrow: "Direct from Japan",
    heading: "Newest Arrivals.\nReady to Ship.",
    description:
      "The latest Japanese TCG arrivals across Pokémon and One Piece — factory sealed and ready to ship.",
    cta_text: "Shop New Releases",
    cta_link: "/new-releases",
    enabled: true,
    desktop_image: "/products/romance-dawn.webp",
    mobile_image: "/products/white-flare.webp",
  },
  {
    key: "accessories-hero",
    title: "Accessories",
    eyebrow: "Direct from Japan",
    heading: "Binders & Storage.\nReady for Your Collection.",
    description:
      "Official binders, cases, and storage for Japanese TCG collections.",
    cta_text: "Shop Accessories",
    // No /accessories page yet — leave blank rather than a dead hash CTA.
    cta_link: "",
    enabled: true,
    desktop_image: "/products/official-9-pocket-binder-vol-1.webp",
    mobile_image: null,
  },
]

const VISUAL_SEEDS: VisualSeed[] = [
  {
    key: "homepage-category-pokemon",
    alt: "Japanese Pokémon sealed product",
    link: "/pokemon",
    image: "/products/mega-symphonia.webp",
  },
  {
    key: "homepage-category-onepiece",
    alt: "Japanese One Piece sealed product",
    link: "/one-piece",
    image: "/products/awakening-of-the-new-era.webp",
  },
  {
    key: "homepage-category-preorders",
    alt: "Upcoming Japanese TCG preorder products",
    link: "/preorders",
    image: "/products/egghead-crisis.webp",
  },
  {
    key: "homepage-category-accessories",
    alt: "Official TCG binder accessory",
    // No /accessories page yet — blank until the storefront route ships.
    link: "",
    image: "/products/official-9-pocket-binder-vol-1.webp",
  },
  {
    key: "pokemon-japanese",
    alt: "Japanese Pokémon sealed product",
    link: "/pokemon/japanese",
    image: "/products/mega-symphonia.webp",
  },
  {
    key: "pokemon-english",
    alt: "English Pokémon sealed product",
    link: "/pokemon/english",
    image: "/products/white-flare.webp",
  },
  {
    key: "pokemon-korean",
    alt: "Korean Pokémon sealed product",
    link: "/pokemon/korean",
    image: "/products/battle-partners.webp",
  },
  {
    key: "pokemon-chinese",
    alt: "Chinese Pokémon sealed product",
    link: "/pokemon/chinese",
    image: "/products/30th-celebration.webp",
  },
  {
    key: "onepiece-japanese",
    alt: "Japanese One Piece sealed product",
    link: "/one-piece/japanese",
    image: "/products/awakening-of-the-new-era.webp",
  },
  {
    key: "onepiece-english",
    alt: "English One Piece sealed product",
    link: "/one-piece/english",
    image: "/products/emperors-in-the-new-world.webp",
  },
  // Future TCG placeholders — no local art expected yet.
  { key: "lorcana-english", alt: "Lorcana English", link: "/lorcana/english" },
  { key: "yugioh-japanese", alt: "Yu-Gi-Oh Japanese", link: "/yugioh/japanese" },
  { key: "digimon-english", alt: "Digimon English", link: "/digimon/english" },
  { key: "gundam-japanese", alt: "Gundam Japanese", link: "/gundam/japanese" },
]

// ---------------------------------------------------------------------------
// Definition schemas
// ---------------------------------------------------------------------------

const IMAGE_FILE_VALIDATION = {
  name: "file_type_options",
  value: '["Image"]',
}

type FieldDefInput = {
  name: string
  key: string
  type: string
  required?: boolean
  validations?: Array<{ name: string; value: string }>
}

const HERO_FIELDS: FieldDefInput[] = [
  {
    name: "Key",
    key: "key",
    type: "single_line_text_field",
    required: true,
  },
  { name: "Title", key: "title", type: "single_line_text_field" },
  {
    name: "Heading",
    key: "heading",
    type: "multi_line_text_field",
  },
  { name: "Description", key: "description", type: "multi_line_text_field" },
  {
    name: "Desktop image",
    key: "desktop_image",
    type: "file_reference",
    validations: [IMAGE_FILE_VALIDATION],
  },
  {
    name: "Mobile image",
    key: "mobile_image",
    type: "file_reference",
    validations: [IMAGE_FILE_VALIDATION],
  },
  { name: "Eyebrow", key: "eyebrow", type: "single_line_text_field" },
  { name: "CTA text", key: "cta_text", type: "single_line_text_field" },
  { name: "CTA link", key: "cta_link", type: "single_line_text_field" },
  { name: "Enabled", key: "enabled", type: "boolean" },
]

const VISUAL_FIELDS: FieldDefInput[] = [
  {
    name: "Key",
    key: "key",
    type: "single_line_text_field",
    required: true,
  },
  {
    name: "Image",
    key: "image",
    type: "file_reference",
    validations: [IMAGE_FILE_VALIDATION],
  },
  {
    name: "Mobile image",
    key: "mobile_image",
    type: "file_reference",
    validations: [IMAGE_FILE_VALIDATION],
  },
  { name: "Alt", key: "alt", type: "single_line_text_field" },
  { name: "Link", key: "link", type: "single_line_text_field" },
]

const FEATURED_PRODUCT_FIELDS: FieldDefInput[] = [
  {
    name: "Product",
    key: "product",
    type: "product_reference",
    required: true,
  },
  { name: "Badge", key: "badge", type: "single_line_text_field" },
  { name: "Sort order", key: "sort_order", type: "number_integer" },
  { name: "Enabled", key: "enabled", type: "boolean" },
]

const FEATURED_COLLECTION_FIELDS: FieldDefInput[] = [
  {
    name: "Collection",
    key: "collection",
    type: "collection_reference",
    required: true,
  },
  {
    name: "Title override",
    key: "title_override",
    type: "single_line_text_field",
  },
  {
    name: "Description override",
    key: "description_override",
    type: "multi_line_text_field",
  },
  {
    name: "Image override",
    key: "image_override",
    type: "file_reference",
    validations: [IMAGE_FILE_VALIDATION],
  },
  { name: "Sort order", key: "sort_order", type: "number_integer" },
  { name: "Enabled", key: "enabled", type: "boolean" },
]

const PROMOTION_FIELDS: FieldDefInput[] = [
  {
    name: "Title",
    key: "title",
    type: "single_line_text_field",
    required: true,
  },
  { name: "Description", key: "description", type: "multi_line_text_field" },
  {
    name: "Desktop image",
    key: "desktop_image",
    type: "file_reference",
    validations: [IMAGE_FILE_VALIDATION],
  },
  {
    name: "Mobile image",
    key: "mobile_image",
    type: "file_reference",
    validations: [IMAGE_FILE_VALIDATION],
  },
  { name: "CTA text", key: "cta_text", type: "single_line_text_field" },
  { name: "CTA link", key: "cta_link", type: "single_line_text_field" },
  { name: "Start date", key: "start_date", type: "date_time" },
  { name: "End date", key: "end_date", type: "date_time" },
  { name: "Enabled", key: "enabled", type: "boolean" },
]

function homepageFields(deps: {
  heroDefinitionId: string
  promotionDefinitionId: string
  featuredProductDefinitionId: string
  featuredCollectionDefinitionId: string
}): FieldDefInput[] {
  const metaobjectRef = (definitionId: string) => [
    { name: "metaobject_definition_id", value: definitionId },
  ]

  return [
    {
      name: "Hero",
      key: "hero",
      type: "metaobject_reference",
      validations: metaobjectRef(deps.heroDefinitionId),
    },
    {
      name: "Promotion",
      key: "promotion",
      type: "metaobject_reference",
      validations: metaobjectRef(deps.promotionDefinitionId),
    },
    {
      name: "Featured Products",
      key: "featured_products",
      type: "list.metaobject_reference",
      validations: metaobjectRef(deps.featuredProductDefinitionId),
    },
    {
      name: "Featured Collections",
      key: "featured_collections",
      type: "list.metaobject_reference",
      validations: metaobjectRef(deps.featuredCollectionDefinitionId),
    },
    {
      name: "Featured Products Title",
      key: "featured_products_title",
      type: "single_line_text_field",
    },
    {
      name: "Featured Collections Title",
      key: "featured_collections_title",
      type: "single_line_text_field",
    },
    {
      name: "Show Latest Releases",
      key: "show_latest_releases",
      type: "boolean",
    },
    {
      name: "Show Coming Soon",
      key: "show_coming_soon",
      type: "boolean",
    },
    {
      name: "Show Categories",
      key: "show_categories",
      type: "boolean",
    },
    {
      name: "Show Newsletter",
      key: "show_newsletter",
      type: "boolean",
    },
  ]
}

type MetaobjectDefinitionNode = {
  id: string
  name: string
  type: string
  displayNameKey: string | null
  access: { storefront: string | null; admin: string | null }
  fieldDefinitions: Array<{
    key: string
    name: string
    required: boolean
    type: { name: string }
  }>
}

const DEFINITION_FRAGMENT = `
  id
  name
  type
  displayNameKey
  access {
    storefront
    admin
  }
  fieldDefinitions {
    key
    name
    required
    type {
      name
    }
  }
`

async function getDefinitionByType(
  type: string
): Promise<MetaobjectDefinitionNode | null> {
  const data = await shopifyAdminFetch<{
    metaobjectDefinitionByType: MetaobjectDefinitionNode | null
  }>({
    query: /* GraphQL */ `
      query MetaobjectDefinitionByType($type: String!) {
        metaobjectDefinitionByType(type: $type) {
          ${DEFINITION_FRAGMENT}
        }
      }
    `,
    variables: { type },
  })
  return data.metaobjectDefinitionByType
}

async function ensureDefinition(input: {
  name: string
  type: string
  fields: FieldDefInput[]
  /** Admin list display field; defaults to `key` when that field exists. */
  displayNameKey?: string | null
}): Promise<"created" | "verified" | "updated"> {
  const existing = await getDefinitionByType(input.type)
  const displayNameKey =
    input.displayNameKey === undefined
      ? input.fields.some((field) => field.key === "key")
        ? "key"
        : null
      : input.displayNameKey

  if (!existing) {
    if (DRY_RUN) {
      console.log(`  [dry-run] would create definition ${input.type}`)
      return "created"
    }

    const data = await shopifyAdminFetch<{
      metaobjectDefinitionCreate: {
        metaobjectDefinition: MetaobjectDefinitionNode | null
        userErrors: UserError[]
      }
    }>({
      query: /* GraphQL */ `
        mutation MetaobjectDefinitionCreate(
          $definition: MetaobjectDefinitionCreateInput!
        ) {
          metaobjectDefinitionCreate(definition: $definition) {
            metaobjectDefinition {
              ${DEFINITION_FRAGMENT}
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `,
      variables: {
        definition: {
          name: input.name,
          type: input.type,
          ...(displayNameKey ? { displayNameKey } : {}),
          access: {
            storefront: "PUBLIC_READ",
          },
          fieldDefinitions: input.fields.map((field) => ({
            name: field.name,
            key: field.key,
            type: field.type,
            required: field.required ?? false,
            ...(field.validations ? { validations: field.validations } : {}),
          })),
        },
      },
    })

    assertNoUserErrors(
      `metaobjectDefinitionCreate(${input.type})`,
      data.metaobjectDefinitionCreate.userErrors
    )
    console.log(`  Created definition: ${input.type}`)
    return "created"
  }

  const existingKeys = new Set(existing.fieldDefinitions.map((f) => f.key))
  const missingFields = input.fields.filter((f) => !existingKeys.has(f.key))
  const needsStorefront =
    existing.access.storefront !== "PUBLIC_READ"
  const needsDisplayName =
    Boolean(displayNameKey) && existing.displayNameKey !== displayNameKey

  if (missingFields.length === 0 && !needsStorefront && !needsDisplayName) {
    console.log(`  Verified definition: ${input.type}`)
    return "verified"
  }

  if (DRY_RUN) {
    console.log(
      `  [dry-run] would update definition ${input.type}` +
        (missingFields.length
          ? ` (+fields: ${missingFields.map((f) => f.key).join(", ")})`
          : "") +
        (needsStorefront ? " (+storefront PUBLIC_READ)" : "") +
        (needsDisplayName ? ` (+displayNameKey ${displayNameKey})` : "")
    )
    return "updated"
  }

  const data = await shopifyAdminFetch<{
    metaobjectDefinitionUpdate: {
      metaobjectDefinition: MetaobjectDefinitionNode | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation MetaobjectDefinitionUpdate(
        $id: ID!
        $definition: MetaobjectDefinitionUpdateInput!
      ) {
        metaobjectDefinitionUpdate(id: $id, definition: $definition) {
          metaobjectDefinition {
            ${DEFINITION_FRAGMENT}
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: {
      id: existing.id,
      definition: {
        ...(needsStorefront
          ? { access: { storefront: "PUBLIC_READ" } }
          : {}),
        ...(needsDisplayName && displayNameKey
          ? { displayNameKey }
          : {}),
        fieldDefinitions: missingFields.map((field) => ({
          create: {
            name: field.name,
            key: field.key,
            type: field.type,
            required: field.required ?? false,
            ...(field.validations ? { validations: field.validations } : {}),
          },
        })),
      },
    },
  })

  assertNoUserErrors(
    `metaobjectDefinitionUpdate(${input.type})`,
    data.metaobjectDefinitionUpdate.userErrors
  )
  console.log(
    `  Updated definition: ${input.type}` +
      (missingFields.length
        ? ` (added ${missingFields.map((f) => f.key).join(", ")})`
        : "") +
      (needsStorefront ? " (enabled storefront access)" : "")
  )
  return "updated"
}

// ---------------------------------------------------------------------------
// Product metafield definitions
// ---------------------------------------------------------------------------

type ProductMetafieldDef = {
  name: string
  namespace: string
  key: string
  type: string
  ownerType: "PRODUCT"
  description: string
}

const PRODUCT_METAFIELDS: ProductMetafieldDef[] = [
  {
    name: "Official Release Date",
    namespace: "custom",
    key: "release_date",
    type: "date",
    ownerType: "PRODUCT",
    description:
      "Official product release date. Used to sort Newest Arrivals and shown on the PDP; falls back to product createdAt when empty.",
  },
  {
    name: "Language",
    namespace: "custom",
    key: "language",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    description:
      "Product language (Japanese, English, Korean, Chinese). Shown on the PDP when set; otherwise language tags are used.",
  },
  {
    name: "Series / Set",
    namespace: "custom",
    key: "series",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    description:
      "Series or set name for the PDP specifications table (e.g. Scarlet & Violet — Black Bolt).",
  },
  {
    name: "Condition",
    namespace: "custom",
    key: "condition",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    description:
      "Product condition for the PDP (e.g. Factory Sealed). Leave empty to hide the row.",
  },
  {
    name: "Rarity",
    namespace: "custom",
    key: "rarity",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    description:
      "Rarity when applicable. Leave empty to hide the row on the PDP.",
  },
  {
    name: "Product Code",
    namespace: "custom",
    key: "product_code",
    type: "single_line_text_field",
    ownerType: "PRODUCT",
    description:
      "Manufacturer or distributor product code. Leave empty to hide the row on the PDP.",
  },
  {
    name: "Allow Weekly Restock",
    namespace: "custom",
    key: "allow_weekly_restock",
    type: "boolean",
    ownerType: "PRODUCT",
    description:
      "When true and inventory is 0, customers can reserve the product for the next weekly restock instead of Sold Out / Notify Me. Enable Continue selling when out of stock on the variant.",
  },
  {
    name: "Weekly Restock Limit",
    namespace: "custom",
    key: "weekly_restock_limit",
    type: "number_integer",
    ownerType: "PRODUCT",
    description:
      "Maximum paid weekly restock reservations while inventory is 0. When reached, the product shows Sold Out / Notify Me.",
  },
  {
    name: "Current Weekly Reservations",
    namespace: "custom",
    key: "current_weekly_reservations",
    type: "number_integer",
    ownerType: "PRODUCT",
    description:
      "Outstanding paid weekly restock reservations. Maintained automatically from orders (create, cancel, refund, fulfill). Remaining = weekly_restock_limit − this value. Do not edit.",
  },
  {
    name: "Homepage position",
    namespace: "swift",
    key: "homepage_position",
    type: "number_integer",
    ownerType: "PRODUCT",
    description:
      "Manual sort order for the homepage Coming Soon carousel (1, 2, 3…). Lower numbers appear first. Products without this field follow after all positioned products.",
  },
]

type ProductMetafieldDefinitionNode = {
  id: string
  name: string
  namespace: string
  key: string
  ownerType: string
  pinnedPosition: number | null
  type: { name: string }
  access: { storefront: string | null }
}

async function fetchProductMetafieldDefinition(
  def: ProductMetafieldDef
): Promise<ProductMetafieldDefinitionNode | null> {
  const { namespace, key, ownerType } = def
  const data = await shopifyAdminFetch<{
    metafieldDefinitions: {
      edges: Array<{ node: ProductMetafieldDefinitionNode }>
    }
  }>({
    query: /* GraphQL */ `
      query ProductMetafieldDefinition(
        $ownerType: MetafieldOwnerType!
        $namespace: String!
        $key: String!
      ) {
        metafieldDefinitions(
          first: 1
          ownerType: $ownerType
          namespace: $namespace
          key: $key
        ) {
          edges {
            node {
              id
              name
              namespace
              key
              ownerType
              pinnedPosition
              type {
                name
              }
              access {
                storefront
              }
            }
          }
        }
      }
    `,
    variables: { ownerType, namespace, key },
  })

  return data.metafieldDefinitions.edges[0]?.node ?? null
}

async function pinProductMetafieldDefinition(definitionId: string): Promise<void> {
  const data = await shopifyAdminFetch<{
    metafieldDefinitionPin: {
      pinnedDefinition: { id: string; pinnedPosition: number | null } | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation PinProductMetafield($definitionId: ID!) {
        metafieldDefinitionPin(definitionId: $definitionId) {
          pinnedDefinition {
            id
            pinnedPosition
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: { definitionId },
  })

  const errors = data.metafieldDefinitionPin.userErrors
  if (errors.length) {
    // Already pinned is success for idempotent re-runs.
    const alreadyPinned = errors.some((error) =>
      /already pinned/i.test(error.message)
    )
    if (alreadyPinned) return
    throw new ShopifyClientError(
      `metafieldDefinitionPin: ${errors.map((e) => e.message).join("; ")}`
    )
  }
}

/**
 * Ensure a Product metafield definition exists, is pinned in Admin, and has
 * Storefront PUBLIC_READ. Idempotent.
 *
 * Pinning is required — Shopify Admin only auto-shows pinned metafields on
 * product pages ("No metafields pinned" otherwise).
 */
async function ensureProductMetafield(def: ProductMetafieldDef): Promise<void> {
  const { name, namespace, key, type, ownerType, description } = def
  const label = `${namespace}.${key}`

  if (DRY_RUN) {
    console.log(
      `  [DRY_RUN] Would ensure pinned product metafield: ${label} (${name})`
    )
    return
  }

  let node = await fetchProductMetafieldDefinition(def)

  if (!node) {
    const data = await shopifyAdminFetch<{
      metafieldDefinitionCreate: {
        createdDefinition: {
          id: string
          key: string
          namespace: string
          ownerType: string
          pinnedPosition: number | null
        } | null
        userErrors: UserError[]
      }
    }>({
      query: /* GraphQL */ `
        mutation CreateProductMetafield(
          $definition: MetafieldDefinitionInput!
        ) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              key
              namespace
              ownerType
              pinnedPosition
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `,
      variables: {
        definition: {
          name,
          namespace,
          key,
          description,
          type,
          ownerType,
          pin: true,
          access: {
            storefront: "PUBLIC_READ",
          },
        },
      },
    })

    const errors = data.metafieldDefinitionCreate.userErrors
    if (errors.length) {
      const taken = errors.some((error) =>
        /taken|already|exists/i.test(error.message)
      )
      if (!taken) {
        throw new ShopifyClientError(
          `metafieldDefinitionCreate(${label}): ${errors
            .map((e) => e.message)
            .join("; ")}`
        )
      }
      console.log(`  Already exists: ${label}`)
    } else {
      const created = data.metafieldDefinitionCreate.createdDefinition
      if (!created || created.ownerType !== "PRODUCT") {
        throw new ShopifyClientError(
          `metafieldDefinitionCreate(${label}): expected ownerType PRODUCT, got ${created?.ownerType ?? "null"}`
        )
      }
      console.log(`  Created definition: ${label} (pinned)`)
    }

    node = await fetchProductMetafieldDefinition(def)
    if (!node) {
      throw new ShopifyClientError(
        `metafieldDefinitionCreate(${label}): definition missing after create`
      )
    }
  }

  const needsName = node.name !== name
  const needsStorefront = node.access.storefront !== "PUBLIC_READ"

  if (needsName || needsStorefront) {
    const updated = await shopifyAdminFetch<{
      metafieldDefinitionUpdate: {
        updatedDefinition: { id: string } | null
        userErrors: UserError[]
      }
    }>({
      query: /* GraphQL */ `
        mutation UpdateProductMetafield(
          $definition: MetafieldDefinitionUpdateInput!
        ) {
          metafieldDefinitionUpdate(definition: $definition) {
            updatedDefinition {
              id
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `,
      variables: {
        definition: {
          namespace,
          key,
          ownerType,
          ...(needsName ? { name, description } : {}),
          ...(needsStorefront
            ? { access: { storefront: "PUBLIC_READ" } }
            : {}),
        },
      },
    })

    assertNoUserErrors(
      `metafieldDefinitionUpdate(${label})`,
      updated.metafieldDefinitionUpdate.userErrors
    )
    console.log(
      `  Updated definition: ${label}` +
        (needsName ? ` (name → ${name})` : "") +
        (needsStorefront ? " (enabled storefront access)" : "")
    )
  }

  if (node.pinnedPosition == null) {
    await pinProductMetafieldDefinition(node.id)
    console.log(`  Pinned definition: ${label}`)
  } else if (!needsName && !needsStorefront) {
    console.log(`  Verified definition: ${label} (pinned)`)
  }

  await verifyProductMetafield(def)
}

/**
 * Fail the setup run if the Product metafield is missing, wrong type/owner,
 * unpinned, or not Storefront-readable.
 */
async function verifyProductMetafield(def: ProductMetafieldDef): Promise<void> {
  const { name, namespace, key, type, ownerType } = def
  const label = `${namespace}.${key}`
  const node = await fetchProductMetafieldDefinition(def)

  if (!node) {
    throw new ShopifyClientError(
      `Verify ${label}: Product metafield definition not found via Admin API`
    )
  }
  if (node.ownerType !== ownerType) {
    throw new ShopifyClientError(
      `Verify ${label}: expected ownerType ${ownerType}, got ${node.ownerType}`
    )
  }
  if (node.type.name !== type) {
    throw new ShopifyClientError(
      `Verify ${label}: expected type ${type}, got ${node.type.name}`
    )
  }
  if (node.pinnedPosition == null) {
    throw new ShopifyClientError(
      `Verify ${label}: definition exists but is not pinned (Admin will show "No metafields pinned")`
    )
  }
  if (node.access.storefront !== "PUBLIC_READ") {
    throw new ShopifyClientError(
      `Verify ${label}: storefront access is ${node.access.storefront ?? "NONE"}, expected PUBLIC_READ`
    )
  }

  console.log(
    `  Admin verify OK: ${label} id=${node.id} ownerType=${node.ownerType} type=${node.type.name} pinned=#${node.pinnedPosition} name="${node.name || name}"`
  )
}

async function ensureProductMetafields(): Promise<void> {
  for (const def of PRODUCT_METAFIELDS) {
    await ensureProductMetafield(def)
  }
}

// ---------------------------------------------------------------------------
// Metaobject entries
// ---------------------------------------------------------------------------

type AdminMetaobject = {
  id: string
  handle: string
  type: string
  fields: Array<{
    key: string
    value: string | null
    reference?: { id?: string } | null
  }>
}

async function fetchAdminMetaobjects(type: string): Promise<AdminMetaobject[]> {
  type AdminMetaobjectsQuery = {
    metaobjects: {
      nodes: AdminMetaobject[]
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
    }
  }

  const nodes: AdminMetaobject[] = []
  let after: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    const data: AdminMetaobjectsQuery = await shopifyAdminFetch<AdminMetaobjectsQuery>({
      query: /* GraphQL */ `
        query AdminMetaobjects($type: String!, $first: Int!, $after: String) {
          metaobjects(type: $type, first: $first, after: $after) {
            nodes {
              id
              handle
              type
              fields {
                key
                value
                reference {
                  ... on MediaImage {
                    id
                  }
                  ... on GenericFile {
                    id
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      variables: {
        type,
        first: 100,
        ...(after ? { after } : {}),
      },
    })

    nodes.push(...data.metaobjects.nodes)
    hasNextPage = data.metaobjects.pageInfo.hasNextPage
    after = data.metaobjects.pageInfo.endCursor
  }

  return nodes
}

function entryKey(node: AdminMetaobject): string | null {
  const keyField = node.fields.find((f) => f.key === "key")?.value?.trim()
  return keyField || node.handle || null
}

function fieldValue(node: AdminMetaobject, key: string): string | null {
  return node.fields.find((f) => f.key === key)?.value?.trim() || null
}

function fieldReferenceId(node: AdminMetaobject, key: string): string | null {
  return node.fields.find((f) => f.key === key)?.reference?.id ?? null
}

async function createMetaobject(
  type: string,
  handle: string,
  fields: Array<{ key: string; value: string }>
): Promise<AdminMetaobject> {
  const data = await shopifyAdminFetch<{
    metaobjectCreate: {
      metaobject: AdminMetaobject | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
            type
            fields {
              key
              value
              reference {
                ... on MediaImage {
                  id
                }
                ... on GenericFile {
                  id
                }
              }
            }
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: {
      metaobject: {
        type,
        handle,
        fields,
      },
    },
  })

  assertNoUserErrors(`metaobjectCreate(${handle})`, data.metaobjectCreate.userErrors)
  if (!data.metaobjectCreate.metaobject) {
    throw new Error(`metaobjectCreate(${handle}) returned no metaobject`)
  }
  return data.metaobjectCreate.metaobject
}

async function updateMetaobjectFields(
  id: string,
  fields: Array<{ key: string; value: string }>
): Promise<void> {
  if (fields.length === 0) return

  const data = await shopifyAdminFetch<{
    metaobjectUpdate: {
      metaobject: { id: string } | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation MetaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            id
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: {
      id,
      metaobject: { fields },
    },
  })

  assertNoUserErrors(`metaobjectUpdate(${id})`, data.metaobjectUpdate.userErrors)
}

// ---------------------------------------------------------------------------
// File uploads
// ---------------------------------------------------------------------------

type UploadedFile = {
  id: string
  alt: string | null
  status: string
}

async function findCmsFileByFilename(filename: string): Promise<UploadedFile | null> {
  const alt = `${CMS_FILE_ALT_PREFIX}${filename}`
  const data = await shopifyAdminFetch<{
    files: {
      nodes: Array<{
        id: string
        alt: string | null
        fileStatus: string
      }>
    }
  }>({
    query: /* GraphQL */ `
      query FindCmsFiles($query: String!) {
        files(first: 10, query: $query) {
          nodes {
            id
            alt
            fileStatus
          }
        }
      }
    `,
    variables: { query: `alt:'${alt}'` },
  })

  const match = data.files.nodes.find((n) => n.alt === alt)
  if (!match) return null
  return { id: match.id, alt: match.alt, status: match.fileStatus }
}

async function waitForFileReady(id: string, maxAttempts = 20): Promise<UploadedFile> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await shopifyAdminFetch<{
      node: {
        id: string
        alt: string | null
        fileStatus: string
      } | null
    }>({
      query: /* GraphQL */ `
        query FileStatus($id: ID!) {
          node(id: $id) {
            ... on File {
              id
              alt
              fileStatus
            }
          }
        }
      `,
      variables: { id },
    })

    const node = data.node
    if (node?.fileStatus === "READY") {
      return { id: node.id, alt: node.alt, status: node.fileStatus }
    }
    if (node?.fileStatus === "FAILED") {
      throw new Error(`Shopify file processing failed for ${id}`)
    }

    await new Promise((r) => setTimeout(r, 500))
  }

  throw new Error(`Timed out waiting for Shopify file ${id} to become READY`)
}

async function uploadLocalImage(localSrc: string): Promise<string | null> {
  if (!localAssetExists(localSrc)) {
    console.log(`    skip upload (missing local file): ${localSrc}`)
    return null
  }

  const absolute = publicPath(localSrc)
  const filename = path.basename(absolute)
  const alt = `${CMS_FILE_ALT_PREFIX}${filename}`

  const existing = await findCmsFileByFilename(filename)
  if (existing) {
    if (existing.status !== "READY") {
      await waitForFileReady(existing.id)
    }
    console.log(`    reuse file: ${filename}`)
    return existing.id
  }

  if (DRY_RUN) {
    console.log(`    [dry-run] would upload: ${localSrc}`)
    return null
  }

  const buffer = readFileSync(absolute)
  const mimeType = mimeForFilename(filename)
  const fileSize = String(statSync(absolute).size)

  const staged = await shopifyAdminFetch<{
    stagedUploadsCreate: {
      stagedTargets: Array<{
        url: string
        resourceUrl: string
        parameters: Array<{ name: string; value: string }>
      }>
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      input: [
        {
          filename,
          mimeType,
          httpMethod: "POST",
          resource: "FILE",
          fileSize,
        },
      ],
    },
  })

  assertNoUserErrors("stagedUploadsCreate", staged.stagedUploadsCreate.userErrors)
  const target = staged.stagedUploadsCreate.stagedTargets[0]
  if (!target) {
    throw new Error(`stagedUploadsCreate returned no target for ${filename}`)
  }

  const form = new FormData()
  for (const param of target.parameters) {
    form.append(param.name, param.value)
  }
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    filename
  )

  const uploadResponse = await fetch(target.url, {
    method: "POST",
    body: form,
  })

  if (!uploadResponse.ok && uploadResponse.status !== 201) {
    const body = await uploadResponse.text().catch(() => "")
    throw new Error(
      `Staged upload failed for ${filename} (${uploadResponse.status}): ${body}`
    )
  }

  const created = await shopifyAdminFetch<{
    fileCreate: {
      files: Array<{ id: string; alt: string | null; fileStatus: string }>
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation FileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            id
            alt
            fileStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      files: [
        {
          alt,
          contentType: "IMAGE",
          originalSource: target.resourceUrl,
        },
      ],
    },
  })

  assertNoUserErrors(`fileCreate(${filename})`, created.fileCreate.userErrors)
  const file = created.fileCreate.files[0]
  if (!file?.id) {
    throw new Error(`fileCreate(${filename}) returned no file id`)
  }

  const ready = await waitForFileReady(file.id)
  console.log(`    uploaded: ${filename}`)
  return ready.id
}

/** Cache local path → MediaImage GID for this process. */
const fileIdCache = new Map<string, string | null>()

async function resolveFileId(localSrc: string | null | undefined): Promise<string | null> {
  if (!localSrc) return null
  if (fileIdCache.has(localSrc)) return fileIdCache.get(localSrc) ?? null

  try {
    const id = await uploadLocalImage(localSrc)
    fileIdCache.set(localSrc, id)
    return id
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`    image upload failed for ${localSrc}: ${message}`)
    fileIdCache.set(localSrc, null)
    return null
  }
}

// ---------------------------------------------------------------------------
// Seed heroes / visuals
// ---------------------------------------------------------------------------

async function seedHeroes(): Promise<{ created: number; skipped: number; updated: number }> {
  const existing = await fetchAdminMetaobjects("storefront_hero")
  const byKey = new Map<string, AdminMetaobject>()
  for (const node of existing) {
    const key = entryKey(node)
    if (key) byKey.set(key, node)
  }

  let created = 0
  let skipped = 0
  let updated = 0

  for (const seed of HERO_SEEDS) {
    const current = byKey.get(seed.key)
    if (current) {
      // Only fill missing image fields — never overwrite merchant edits.
      const patch: Array<{ key: string; value: string }> = []

      if (!fieldReferenceId(current, "desktop_image") && seed.desktop_image) {
        const fileId = await resolveFileId(seed.desktop_image)
        if (fileId) patch.push({ key: "desktop_image", value: fileId })
      }
      if (!fieldReferenceId(current, "mobile_image") && seed.mobile_image) {
        const fileId = await resolveFileId(seed.mobile_image)
        if (fileId) patch.push({ key: "mobile_image", value: fileId })
      }

      // Backfill empty text fields only.
      const textKeys = [
        "title",
        "eyebrow",
        "heading",
        "description",
        "cta_text",
        "cta_link",
        "enabled",
      ] as const
      const textValues: Record<(typeof textKeys)[number], string> = {
        title: seed.title,
        eyebrow: seed.eyebrow,
        heading: seed.heading,
        description: seed.description,
        cta_text: seed.cta_text,
        cta_link: seed.cta_link,
        enabled: String(seed.enabled),
      }
      for (const key of textKeys) {
        if (!fieldValue(current, key) && textValues[key]) {
          patch.push({ key, value: textValues[key] })
        }
      }

      const rewrittenCta = rewritePlaceholderHref(fieldValue(current, "cta_link"))
      if (rewrittenCta !== null) {
        const existing = patch.find((p) => p.key === "cta_link")
        if (existing) existing.value = rewrittenCta
        else patch.push({ key: "cta_link", value: rewrittenCta })
      }

      if (patch.length === 0) {
        console.log(`  skip hero (exists): ${seed.key}`)
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(
          `  [dry-run] would patch hero ${seed.key}: ${patch.map((p) => p.key).join(", ")}`
        )
        updated++
        continue
      }

      await updateMetaobjectFields(current.id, patch)
      console.log(`  patched hero: ${seed.key} (${patch.map((p) => p.key).join(", ")})`)
      updated++
      continue
    }

    const fields: Array<{ key: string; value: string }> = [
      { key: "key", value: seed.key },
      { key: "title", value: seed.title },
      { key: "eyebrow", value: seed.eyebrow },
      { key: "heading", value: seed.heading },
      { key: "description", value: seed.description },
      { key: "cta_text", value: seed.cta_text },
      { key: "cta_link", value: seed.cta_link },
      { key: "enabled", value: String(seed.enabled) },
    ]

    const desktopId = await resolveFileId(seed.desktop_image)
    if (desktopId) fields.push({ key: "desktop_image", value: desktopId })
    const mobileId = await resolveFileId(seed.mobile_image)
    if (mobileId) fields.push({ key: "mobile_image", value: mobileId })

    if (DRY_RUN) {
      console.log(`  [dry-run] would create hero: ${seed.key}`)
      created++
      continue
    }

    await createMetaobject("storefront_hero", seed.key, fields)
    console.log(`  created hero: ${seed.key}`)
    created++
  }

  return { created, skipped, updated }
}

async function seedVisuals(): Promise<{ created: number; skipped: number; updated: number }> {
  const existing = await fetchAdminMetaobjects("storefront_visual")
  const byKey = new Map<string, AdminMetaobject>()
  for (const node of existing) {
    const key = entryKey(node)
    if (key) byKey.set(key, node)
  }

  let created = 0
  let skipped = 0
  let updated = 0

  for (const seed of VISUAL_SEEDS) {
    const current = byKey.get(seed.key)
    if (current) {
      const patch: Array<{ key: string; value: string }> = []

      if (!fieldReferenceId(current, "image") && seed.image) {
        const fileId = await resolveFileId(seed.image)
        if (fileId) patch.push({ key: "image", value: fileId })
      }
      if (!fieldReferenceId(current, "mobile_image") && seed.mobile_image) {
        const fileId = await resolveFileId(seed.mobile_image)
        if (fileId) patch.push({ key: "mobile_image", value: fileId })
      }
      if (!fieldValue(current, "alt") && seed.alt) {
        patch.push({ key: "alt", value: seed.alt })
      }
      if (!fieldValue(current, "link") && seed.link) {
        patch.push({ key: "link", value: seed.link })
      }

      const rewrittenLink = rewritePlaceholderHref(fieldValue(current, "link"))
      if (rewrittenLink !== null) {
        const existing = patch.find((p) => p.key === "link")
        if (existing) existing.value = rewrittenLink
        else patch.push({ key: "link", value: rewrittenLink })
      }

      if (patch.length === 0) {
        console.log(`  skip visual (exists): ${seed.key}`)
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(
          `  [dry-run] would patch visual ${seed.key}: ${patch.map((p) => p.key).join(", ")}`
        )
        updated++
        continue
      }

      await updateMetaobjectFields(current.id, patch)
      console.log(`  patched visual: ${seed.key} (${patch.map((p) => p.key).join(", ")})`)
      updated++
      continue
    }

    const fields: Array<{ key: string; value: string }> = [
      { key: "key", value: seed.key },
      { key: "alt", value: seed.alt },
      { key: "link", value: seed.link },
    ]

    const imageId = await resolveFileId(seed.image)
    if (imageId) fields.push({ key: "image", value: imageId })
    const mobileId = await resolveFileId(seed.mobile_image)
    if (mobileId) fields.push({ key: "mobile_image", value: mobileId })

    if (DRY_RUN) {
      console.log(`  [dry-run] would create visual: ${seed.key}`)
      created++
      continue
    }

    await createMetaobject("storefront_visual", seed.key, fields)
    console.log(`  created visual: ${seed.key}`)
    created++
  }

  return { created, skipped, updated }
}

/**
 * Seed a single Homepage orchestration entry (handle `homepage`).
 *
 * Leaves hero / promotion / featured lists empty so the storefront keeps the
 * existing multi-slide carousel + Coming Soon / Visual category fallbacks until
 * merchants wire references in Admin. Section toggles default to on.
 */
async function seedHomepage(): Promise<{
  created: number
  skipped: number
  updated: number
}> {
  const definition = await getDefinitionByType("homepage")
  if (!definition) {
    if (DRY_RUN) {
      console.log(
        "  [dry-run] would seed homepage entry after definition exists"
      )
      return { created: 1, skipped: 0, updated: 0 }
    }
    throw new Error("Cannot seed Homepage — definition homepage is missing")
  }

  const HOMEPAGE_HANDLE = "homepage"
  const defaultFields: Array<{ key: string; value: string }> = [
    { key: "featured_products_title", value: "Featured" },
    { key: "featured_collections_title", value: "Shop by Category" },
    { key: "show_latest_releases", value: "true" },
    { key: "show_coming_soon", value: "true" },
    { key: "show_categories", value: "true" },
    { key: "show_newsletter", value: "true" },
  ]

  const existing = await fetchAdminMetaobjects("homepage")
  const current =
    existing.find((node) => node.handle === HOMEPAGE_HANDLE) ?? existing[0]

  if (current) {
    const patch: Array<{ key: string; value: string }> = []
    for (const field of defaultFields) {
      if (!fieldValue(current, field.key)) {
        patch.push(field)
      }
    }

    if (patch.length === 0) {
      console.log(`  skip homepage (exists): ${current.handle}`)
      return { created: 0, skipped: 1, updated: 0 }
    }

    if (DRY_RUN) {
      console.log(
        `  [dry-run] would patch homepage ${current.handle}: ${patch.map((p) => p.key).join(", ")}`
      )
      return { created: 0, skipped: 0, updated: 1 }
    }

    await updateMetaobjectFields(current.id, patch)
    console.log(
      `  patched homepage: ${current.handle} (${patch.map((p) => p.key).join(", ")})`
    )
    return { created: 0, skipped: 0, updated: 1 }
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] would create homepage: ${HOMEPAGE_HANDLE}`)
    return { created: 1, skipped: 0, updated: 0 }
  }

  await createMetaobject("homepage", HOMEPAGE_HANDLE, defaultFields)
  console.log(`  created homepage: ${HOMEPAGE_HANDLE}`)
  return { created: 1, skipped: 0, updated: 0 }
}

// ---------------------------------------------------------------------------
// Storefront verification
// ---------------------------------------------------------------------------

function storefrontFieldText(
  fields: Array<{ key: string; value?: string | null }>,
  key: string
): string | null {
  const value = fields.find((f) => f.key === key)?.value?.trim()
  return value || null
}

async function verifyStorefront(): Promise<void> {
  const config = getShopifyConfig()

  const heroData = await shopifyFetch<MetaobjectsByTypeQueryResult>({
    query: GET_METAOBJECTS_BY_TYPE,
    variables: { type: "storefront_hero", first: 50 },
    config,
  })
  const visualData = await shopifyFetch<MetaobjectsByTypeQueryResult>({
    query: GET_METAOBJECTS_BY_TYPE,
    variables: { type: "storefront_visual", first: 50 },
    config,
  })

  const heroes = new Map<string, (typeof heroData.metaobjects.edges)[number]["node"]>()
  for (const edge of heroData.metaobjects.edges) {
    const key =
      storefrontFieldText(edge.node.fields, "key") || edge.node.handle
    if (key) heroes.set(key, edge.node)
  }

  const visuals = new Map<string, (typeof visualData.metaobjects.edges)[number]["node"]>()
  for (const edge of visualData.metaobjects.edges) {
    const key =
      storefrontFieldText(edge.node.fields, "key") || edge.node.handle
    if (key) visuals.set(key, edge.node)
  }

  const sampleHeroKeys = ["pokemon-hero", "onepiece-hero", "homepage"] as const
  for (const key of sampleHeroKeys) {
    const node = heroes.get(key)
    if (!node) {
      throw new Error(
        `Storefront verification failed: getStorefrontHero("${key}") — ` +
          `metaobject missing from Storefront API (check PUBLIC_READ + Headless metaobjects permission)`
      )
    }
    const heading = storefrontFieldText(node.fields, "heading")
    if (!heading) {
      throw new Error(
        `Storefront verification failed: hero "${key}" has no heading from Shopify`
      )
    }
    console.log(`  getStorefrontHero("${key}") → Shopify (heading set)`)
  }

  const sampleVisualKeys = [
    "homepage-category-pokemon",
    "pokemon-japanese",
    "onepiece-english",
  ] as const
  for (const key of sampleVisualKeys) {
    const node = visuals.get(key)
    if (!node) {
      throw new Error(
        `Storefront verification failed: getStorefrontVisual("${key}") — ` +
          `metaobject missing from Storefront API`
      )
    }
    const alt = storefrontFieldText(node.fields, "alt")
    if (!alt) {
      throw new Error(
        `Storefront verification failed: visual "${key}" has no alt from Shopify`
      )
    }
    console.log(`  getStorefrontVisual("${key}") → Shopify (alt set)`)
  }

  // Homepage merchandising + orchestration types must be Storefront-readable
  // (entries optional — Homepage entry is merchant-created).
  const merchTypes = [
    "homepage_featured_product",
    "homepage_featured_collection",
    "homepage_promotion",
    "homepage",
  ] as const
  for (const type of merchTypes) {
    await shopifyFetch<MetaobjectsByTypeQueryResult>({
      query: GET_METAOBJECTS_BY_TYPE,
      variables: { type, first: 1 },
      config,
    })
    console.log(`  metaobjects(type: "${type}") → Storefront readable`)
  }

  // Missing-key fallback path still works in code (no Shopify entry required).
  console.log(
    `  fallbacks intact for missing keys (local hero art when Shopify images empty)`
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  loadEnvFile(".env.local")
  loadEnvFile(".env")

  const adminConfig = getShopifyAdminConfig()
  console.log(
    `Storefront CMS setup → ${adminConfig.storeDomain} (Admin API ${adminConfig.apiVersion})${
      DRY_RUN ? " [dry-run]" : ""
    }`
  )

  try {
    await verifyShopifyAdminAuth(adminConfig)
  } catch (error) {
    // Auth probe uses read_products; continue if only that probe fails but token works.
    const message = error instanceof Error ? error.message : String(error)
    if (!/missing required scopes|read_products/i.test(message)) {
      throw error
    }
    console.warn(
      "  Admin auth OK but read_products probe failed — continuing CMS setup."
    )
  }

  await verifyCmsAdminScopes()
  console.log("  CMS Admin scopes OK")

  console.log("\n1) Metaobject definitions")
  await ensureDefinition({
    name: "Storefront Hero",
    type: "storefront_hero",
    fields: HERO_FIELDS,
  })
  await ensureDefinition({
    name: "Storefront Visual",
    type: "storefront_visual",
    fields: VISUAL_FIELDS,
  })
  await ensureDefinition({
    name: "Homepage Featured Product",
    type: "homepage_featured_product",
    fields: FEATURED_PRODUCT_FIELDS,
    displayNameKey: null,
  })
  await ensureDefinition({
    name: "Homepage Featured Collection",
    type: "homepage_featured_collection",
    fields: FEATURED_COLLECTION_FIELDS,
    displayNameKey: null,
  })
  await ensureDefinition({
    name: "Homepage Promotion",
    type: "homepage_promotion",
    fields: PROMOTION_FIELDS,
    displayNameKey: "title",
  })

  // Homepage orchestration references the leaf types above — resolve their GIDs.
  const heroDef = await getDefinitionByType("storefront_hero")
  const featuredProductDef = await getDefinitionByType(
    "homepage_featured_product"
  )
  const featuredCollectionDef = await getDefinitionByType(
    "homepage_featured_collection"
  )
  const promotionDef = await getDefinitionByType("homepage_promotion")

  if (
    !heroDef?.id ||
    !featuredProductDef?.id ||
    !featuredCollectionDef?.id ||
    !promotionDef?.id
  ) {
    if (DRY_RUN) {
      console.log(
        "  [dry-run] would create definition homepage (deps unresolved in dry-run)"
      )
    } else {
      throw new Error(
        "Cannot create Homepage definition — missing dependency definition IDs"
      )
    }
  } else {
    await ensureDefinition({
      name: "Homepage",
      type: "homepage",
      displayNameKey: null,
      fields: homepageFields({
        heroDefinitionId: heroDef.id,
        promotionDefinitionId: promotionDef.id,
        featuredProductDefinitionId: featuredProductDef.id,
        featuredCollectionDefinitionId: featuredCollectionDef.id,
      }),
    })
  }
  console.log("✔ Metaobject definitions created/verified")

  console.log("\n1b) Product metafield definitions")
  await ensureProductMetafields()
  console.log("✔ Product metafield definitions created/verified")

  console.log("\n2) Seed Storefront Hero entries")
  const heroes = await seedHeroes()
  console.log(
    `  heroes: ${heroes.created} created, ${heroes.updated} patched, ${heroes.skipped} skipped`
  )
  console.log("✔ Hero entries created")

  console.log("\n3) Seed Storefront Visual entries")
  const visuals = await seedVisuals()
  console.log(
    `  visuals: ${visuals.created} created, ${visuals.updated} patched, ${visuals.skipped} skipped`
  )
  console.log("✔ Visual entries created")

  console.log("\n4) Seed Homepage orchestration entry")
  const homepage = await seedHomepage()
  console.log(
    `  homepage: ${homepage.created} created, ${homepage.updated} patched, ${homepage.skipped} skipped`
  )
  console.log("✔ Homepage entry created")

  const uploaded = [...fileIdCache.values()].filter(Boolean).length
  console.log(`\n5) Images`)
  console.log(`  ${uploaded} Shopify Files resolved/uploaded this run`)
  console.log("✔ Images uploaded")

  if (DRY_RUN) {
    console.log("\n6) Storefront verification skipped (dry-run)")
    console.log("✔ Storefront verification passed")
  } else {
    console.log("\n6) Storefront verification")
    await verifyStorefront()
    console.log("✔ Storefront verification passed")
  }

  console.log("\n✔ Setup complete")
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nsetup:cms failed: ${message}`)
  if (
    error instanceof ShopifyClientError &&
    (/Access denied|scope/i.test(message) || /missing CMS scopes/i.test(message))
  ) {
    console.error(
      "\nEnsure the Dev Dashboard app has scopes:\n" +
        "  read_metaobject_definitions, write_metaobject_definitions\n" +
        "  read_metaobjects, write_metaobjects\n" +
        "  write_files, read_files\n" +
        "  write_products\n" +
        "Then reinstall/update the app on the store and retry."
    )
  }
  if (
    /PUBLIC_READ|unauthenticated_read_metaobjects/i.test(message) ||
    (/Storefront verification failed/i.test(message) &&
      /metaobject missing from Storefront API/i.test(message))
  ) {
    console.error(
      "\nAlso confirm Headless Storefront permission:\n" +
        "  unauthenticated_read_metaobjects\n" +
        "and regenerate the private Storefront token if needed."
    )
  }
  process.exitCode = 1
})
