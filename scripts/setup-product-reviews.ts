/**
 * Ensure product review metaobject + related metafield definitions exist.
 *
 * Usage:
 *   npm run setup:reviews
 *   npm run setup:reviews -- --dry-run
 *
 * Creates / verifies:
 *   - Metaobject definition `swift_product_review` (Admin-only; not Storefront-readable)
 *   - Product metafields: swift.review_rating, swift.review_count, swift.review_breakdown
 *   - Customer metafield: swift.review_helpful_votes
 *   - Webhook subscriptions (metaobjects create/update/delete → /api/webhooks/reviews)
 *
 * Required Admin scopes:
 *   read_metaobject_definitions, write_metaobject_definitions,
 *   read_metaobjects, write_metaobjects,
 *   write_products, read_products,
 *   read_customers, write_customers,
 *   read_orders (purchase verification at runtime),
 *   read_files, write_files (review photo uploads at runtime)
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import {
  REVIEW_BREAKDOWN_KEY,
  REVIEW_BREAKDOWN_METAFIELD_TYPE,
  REVIEW_COUNT_KEY,
  REVIEW_COUNT_METAFIELD_TYPE,
  REVIEW_FIELD,
  REVIEW_HELPFUL_VOTES_KEY,
  REVIEW_HELPFUL_VOTES_METAFIELD_TYPE,
  REVIEW_METAOBJECT_TYPE,
  REVIEW_NAMESPACE,
  REVIEW_RATING_KEY,
  REVIEW_RATING_METAFIELD_TYPE,
  REVIEW_STATUS,
} from "../lib/reviews/constants"
import { shopifyAdminFetch } from "../lib/shopify/admin"
import { ShopifyClientError } from "../lib/shopify/client"

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
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "1"

type UserError = { field?: string[] | null; message: string; code?: string | null }

type FieldDefInput = {
  name: string
  key: string
  type: string
  required?: boolean
  validations?: Array<{ name: string; value: string }>
}

type MetaobjectDefinitionNode = {
  id: string
  name: string
  type: string
  displayNameKey: string | null
  access: { storefront: string | null; admin?: string | null }
  fieldDefinitions: Array<{ key: string; name: string; type: { name: string } }>
}

type MetafieldDefinitionNode = {
  id: string
  name: string
  namespace: string
  key: string
  type: { name: string }
  ownerType: string
  access: {
    admin: string | null
    customerAccount: string | null
    storefront: string | null
  }
}

const IMAGE_FILE_VALIDATION = {
  name: "file_type_options",
  value: '["Image"]',
}

const REVIEW_FIELDS: FieldDefInput[] = [
  {
    name: "Product",
    key: REVIEW_FIELD.product,
    type: "product_reference",
    required: true,
  },
  {
    name: "Product ID",
    key: REVIEW_FIELD.productId,
    type: "single_line_text_field",
    required: true,
  },
  {
    name: "Customer",
    key: REVIEW_FIELD.customer,
    type: "customer_reference",
    required: true,
  },
  {
    name: "Customer ID",
    key: REVIEW_FIELD.customerId,
    type: "single_line_text_field",
    required: true,
  },
  {
    name: "Order",
    key: REVIEW_FIELD.order,
    type: "single_line_text_field",
  },
  {
    name: "Rating",
    key: REVIEW_FIELD.rating,
    type: "number_integer",
    required: true,
    validations: [
      { name: "min", value: "1" },
      { name: "max", value: "5" },
    ],
  },
  {
    name: "Title",
    key: REVIEW_FIELD.title,
    type: "single_line_text_field",
  },
  {
    name: "Body",
    key: REVIEW_FIELD.body,
    type: "multi_line_text_field",
    required: true,
  },
  {
    name: "Images",
    key: REVIEW_FIELD.images,
    type: "list.file_reference",
    validations: [IMAGE_FILE_VALIDATION],
  },
  {
    name: "Verified purchase",
    key: REVIEW_FIELD.verifiedPurchase,
    type: "boolean",
  },
  {
    name: "Helpful count",
    key: REVIEW_FIELD.helpfulCount,
    type: "number_integer",
  },
  {
    name: "Status",
    key: REVIEW_FIELD.status,
    type: "single_line_text_field",
    required: true,
    validations: [
      {
        name: "choices",
        value: JSON.stringify([
          REVIEW_STATUS.pending,
          REVIEW_STATUS.approved,
          REVIEW_STATUS.rejected,
        ]),
      },
    ],
  },
  {
    name: "Nickname",
    key: REVIEW_FIELD.nickname,
    type: "single_line_text_field",
  },
  {
    name: "Reviewed at",
    key: REVIEW_FIELD.reviewedAt,
    type: "date_time",
    required: true,
  },
]

function assertNoUserErrors(label: string, errors: UserError[] | undefined) {
  if (!errors?.length) return
  throw new Error(`${label}: ${errors.map((e) => e.message).join("; ")}`)
}

async function verifyScopes(): Promise<void> {
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
    "write_products",
    "read_customers",
    "write_customers",
  ]
  const recommended = ["read_orders", "read_files", "write_files", "read_products"]
  const missing = required.filter((scope) => !granted.has(scope))
  if (missing.length) {
    throw new ShopifyClientError(
      `Shopify Admin token is missing review scopes: ${missing.join(", ")}.\n` +
        `Enable in Dev Dashboard → app → Scopes, reinstall the app, then retry.`
    )
  }

  const missingRecommended = recommended.filter((scope) => !granted.has(scope))
  if (missingRecommended.length) {
    console.log(
      `  Note: recommended runtime scopes not granted yet: ${missingRecommended.join(", ")}`
    )
  }
}

async function getDefinitionByType(
  type: string
): Promise<MetaobjectDefinitionNode | null> {
  const data = await shopifyAdminFetch<{
    metaobjectDefinitionByType: MetaobjectDefinitionNode | null
  }>({
    query: /* GraphQL */ `
      query MetaobjectDefinitionByType($type: String!) {
        metaobjectDefinitionByType(type: $type) {
          id
          name
          type
          displayNameKey
          access {
            storefront
          }
          fieldDefinitions {
            key
            name
            type {
              name
            }
          }
        }
      }
    `,
    variables: { type },
  })
  return data.metaobjectDefinitionByType
}

async function ensureReviewDefinition(): Promise<void> {
  const existing = await getDefinitionByType(REVIEW_METAOBJECT_TYPE)
  const displayNameKey = REVIEW_FIELD.title

  if (!existing) {
    if (DRY_RUN) {
      console.log(`  [DRY_RUN] Would create metaobject ${REVIEW_METAOBJECT_TYPE}`)
      return
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
              id
              type
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
          name: "Swift Product Review",
          type: REVIEW_METAOBJECT_TYPE,
          displayNameKey,
          // Intentionally NOT storefront-readable — pending reviews must stay private.
          access: {
            storefront: "NONE",
          },
          fieldDefinitions: REVIEW_FIELDS.map((field) => ({
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
      "metaobjectDefinitionCreate",
      data.metaobjectDefinitionCreate.userErrors
    )
    console.log(`  Created definition: ${REVIEW_METAOBJECT_TYPE}`)
    return
  }

  const existingKeys = new Set(existing.fieldDefinitions.map((f) => f.key))
  const missingFields = REVIEW_FIELDS.filter((f) => !existingKeys.has(f.key))
  const needsStorefrontOff = existing.access.storefront === "PUBLIC_READ"

  if (missingFields.length === 0 && !needsStorefrontOff) {
    console.log(`  Verified definition: ${REVIEW_METAOBJECT_TYPE}`)
    return
  }

  if (DRY_RUN) {
    console.log(
      `  [DRY_RUN] Would update ${REVIEW_METAOBJECT_TYPE}` +
        (missingFields.length
          ? ` (+fields: ${missingFields.map((f) => f.key).join(", ")})`
          : "") +
        (needsStorefrontOff ? " (storefront → NONE)" : "")
    )
    return
  }

  const data = await shopifyAdminFetch<{
    metaobjectDefinitionUpdate: {
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation MetaobjectDefinitionUpdate(
        $id: ID!
        $definition: MetaobjectDefinitionUpdateInput!
      ) {
        metaobjectDefinitionUpdate(id: $id, definition: $definition) {
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
        ...(needsStorefrontOff ? { access: { storefront: "NONE" } } : {}),
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
    "metaobjectDefinitionUpdate",
    data.metaobjectDefinitionUpdate.userErrors
  )
  console.log(`  Updated definition: ${REVIEW_METAOBJECT_TYPE}`)
}

async function fetchMetafieldDefinition(input: {
  ownerType: "PRODUCT" | "CUSTOMER"
  namespace: string
  key: string
}): Promise<MetafieldDefinitionNode | null> {
  const data = await shopifyAdminFetch<{
    metafieldDefinitions: { nodes: MetafieldDefinitionNode[] }
  }>({
    query: /* GraphQL */ `
      query MetafieldDefinition(
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
          nodes {
            id
            name
            namespace
            key
            type {
              name
            }
            ownerType
            access {
              admin
              customerAccount
              storefront
            }
          }
        }
      }
    `,
    variables: input,
  })
  return data.metafieldDefinitions.nodes[0] ?? null
}

async function ensureMetafieldDefinition(input: {
  name: string
  ownerType: "PRODUCT" | "CUSTOMER"
  namespace: string
  key: string
  type: string
  description: string
  storefrontPublic?: boolean
}): Promise<void> {
  const existing = await fetchMetafieldDefinition({
    ownerType: input.ownerType,
    namespace: input.namespace,
    key: input.key,
  })

  if (existing) {
    console.log(`  Found metafield: ${input.ownerType} ${input.namespace}.${input.key}`)
    if (
      input.storefrontPublic &&
      existing.access.storefront !== "PUBLIC_READ" &&
      existing.access.storefront !== "public_read"
    ) {
      console.log(
        `  ACTION REQUIRED: set Storefront access to Read for ${input.namespace}.${input.key}`
      )
      console.log(
        `    Admin → Settings → Custom data → ${input.ownerType === "PRODUCT" ? "Products" : "Customers"} → ${input.name}`
      )
    }
    return
  }

  if (DRY_RUN) {
    console.log(
      `  [DRY_RUN] Would create ${input.ownerType} metafield ${input.namespace}.${input.key}`
    )
    return
  }

  const data = await shopifyAdminFetch<{
    metafieldDefinitionCreate: {
      createdDefinition: { id: string } | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation CreateMetafield($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
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
        name: input.name,
        namespace: input.namespace,
        key: input.key,
        description: input.description,
        type: input.type,
        ownerType: input.ownerType,
        ...(input.storefrontPublic
          ? {
              access: {
                storefront: "PUBLIC_READ",
              },
            }
          : {}),
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
        `metafieldDefinitionCreate(${input.key}): ${errors.map((e) => e.message).join("; ")}`
      )
    }
    console.log(`  Already exists: ${input.namespace}.${input.key}`)
    return
  }

  console.log(
    `  Created metafield: ${input.ownerType} ${input.namespace}.${input.key} (${input.type})`
  )
}

// ---------------------------------------------------------------------------
// Webhooks — metaobject create/update/delete → aggregate sync
// ---------------------------------------------------------------------------

const REVIEW_WEBHOOK_TOPICS = [
  "METAOBJECTS_CREATE",
  "METAOBJECTS_UPDATE",
  "METAOBJECTS_DELETE",
] as const

type ReviewWebhookTopic = (typeof REVIEW_WEBHOOK_TOPICS)[number]

const REVIEW_WEBHOOK_FILTER = `type:${REVIEW_METAOBJECT_TYPE}`

/** Production callback; overridden by SHOPIFY_APP_URL when set. */
const DEFAULT_REVIEW_WEBHOOK_ORIGIN = "https://www.swifttcg.com"
const REVIEW_WEBHOOK_PATH = "/api/webhooks/reviews"

function reviewWebhookUri(): string {
  const origin = (
    process.env.SHOPIFY_APP_URL?.trim() || DEFAULT_REVIEW_WEBHOOK_ORIGIN
  ).replace(/\/$/, "")
  return `${origin}${REVIEW_WEBHOOK_PATH}`
}

type ExistingWebhook = {
  id: string
  topic: string
  filter: string | null
  callbackUrl: string | null
}

async function listReviewWebhooks(): Promise<ExistingWebhook[]> {
  const data = await shopifyAdminFetch<{
    webhookSubscriptions: {
      edges: Array<{
        node: {
          id: string
          topic: string
          filter?: string | null
          endpoint: {
            __typename: string
            callbackUrl?: string | null
          }
        }
      }>
    }
  }>({
    query: /* GraphQL */ `
      query ReviewWebhookSubscriptions($first: Int!) {
        webhookSubscriptions(first: $first) {
          edges {
            node {
              id
              topic
              filter
              endpoint {
                __typename
                ... on WebhookHttpEndpoint {
                  callbackUrl
                }
              }
            }
          }
        }
      }
    `,
    variables: { first: 100 },
  })

  return data.webhookSubscriptions.edges.map(({ node }) => ({
    id: node.id,
    topic: node.topic,
    filter: node.filter ?? null,
    callbackUrl: node.endpoint.callbackUrl ?? null,
  }))
}

function webhookAlreadyExists(
  existing: ExistingWebhook[],
  topic: ReviewWebhookTopic,
  uri: string
): boolean {
  const normalize = (url: string) => url.replace(/\/$/, "").toLowerCase()
  const target = normalize(uri)
  return existing.some((hook) => {
    if (hook.topic !== topic) return false
    if (!hook.callbackUrl || normalize(hook.callbackUrl) !== target) return false
    // Metaobject topics require type:… filter; treat matching filter (or legacy null) as same.
    if (hook.filter && hook.filter !== REVIEW_WEBHOOK_FILTER) return false
    return true
  })
}

async function createReviewWebhook(
  topic: ReviewWebhookTopic,
  uri: string
): Promise<void> {
  const data = await shopifyAdminFetch<{
    webhookSubscriptionCreate: {
      webhookSubscription: { id: string; topic: string; uri?: string | null } | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation ReviewWebhookCreate(
        $topic: WebhookSubscriptionTopic!
        $webhookSubscription: WebhookSubscriptionInput!
      ) {
        webhookSubscriptionCreate(
          topic: $topic
          webhookSubscription: $webhookSubscription
        ) {
          webhookSubscription {
            id
            topic
            uri
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      topic,
      webhookSubscription: {
        uri,
        format: "JSON",
        filter: REVIEW_WEBHOOK_FILTER,
      },
    },
  })

  assertNoUserErrors(
    `webhookSubscriptionCreate(${topic})`,
    data.webhookSubscriptionCreate.userErrors
  )
}

async function ensureReviewWebhooks(): Promise<void> {
  const uri = reviewWebhookUri()
  console.log(`  Target: ${uri}`)
  console.log(`  Filter: ${REVIEW_WEBHOOK_FILTER}`)

  let existing: ExistingWebhook[] = []
  try {
    existing = await listReviewWebhooks()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/access denied/i.test(message)) {
      throw new ShopifyClientError(
        "Unable to list webhook subscriptions (Access denied).\n" +
          "Ensure the Dev Dashboard app can manage webhooks, then reinstall/update on the store."
      )
    }
    throw error
  }

  for (const topic of REVIEW_WEBHOOK_TOPICS) {
    if (webhookAlreadyExists(existing, topic, uri)) {
      console.log(`  Verified webhook: ${topic}`)
      continue
    }

    if (DRY_RUN) {
      console.log(`  [DRY_RUN] Would create webhook: ${topic} → ${uri}`)
      continue
    }

    try {
      await createReviewWebhook(topic, uri)
      console.log(`  Created webhook: ${topic}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/taken|already|exists/i.test(message)) {
        console.log(`  Already exists: ${topic}`)
        continue
      }
      if (/access denied/i.test(message)) {
        throw new ShopifyClientError(
          `Unable to create ${topic} webhook (Access denied).\n` +
            "Ensure read_metaobjects is granted and the app is reinstalled on the store."
        )
      }
      throw error
    }
  }
}

async function main() {
  loadEnvFile(".env.local")
  loadEnvFile(".env")

  console.log("=== Swift TCG product reviews setup ===")
  if (DRY_RUN) console.log("Mode: DRY RUN\n")

  await verifyScopes()

  console.log("\nMetaobject definition")
  await ensureReviewDefinition()

  console.log("\nProduct aggregate metafields")
  await ensureMetafieldDefinition({
    name: "Review rating",
    ownerType: "PRODUCT",
    namespace: REVIEW_NAMESPACE,
    key: REVIEW_RATING_KEY,
    type: REVIEW_RATING_METAFIELD_TYPE,
    description: "Average approved review rating (1.0–5.0).",
    storefrontPublic: true,
  })
  await ensureMetafieldDefinition({
    name: "Review count",
    ownerType: "PRODUCT",
    namespace: REVIEW_NAMESPACE,
    key: REVIEW_COUNT_KEY,
    type: REVIEW_COUNT_METAFIELD_TYPE,
    description: "Count of approved product reviews.",
    storefrontPublic: true,
  })
  await ensureMetafieldDefinition({
    name: "Review breakdown",
    ownerType: "PRODUCT",
    namespace: REVIEW_NAMESPACE,
    key: REVIEW_BREAKDOWN_KEY,
    type: REVIEW_BREAKDOWN_METAFIELD_TYPE,
    description: "Star breakdown JSON for approved reviews.",
    storefrontPublic: true,
  })

  console.log("\nCustomer helpful-votes metafield")
  await ensureMetafieldDefinition({
    name: "Review helpful votes",
    ownerType: "CUSTOMER",
    namespace: REVIEW_NAMESPACE,
    key: REVIEW_HELPFUL_VOTES_KEY,
    type: REVIEW_HELPFUL_VOTES_METAFIELD_TYPE,
    description: "Review metaobject GIDs this customer marked helpful.",
  })

  console.log("\nWebhook subscriptions")
  await ensureReviewWebhooks()

  console.log("\n--- Moderation ---")
  console.log("Reviews are created with status=pending.")
  console.log(
    "Approve in Admin → Content → Metaobjects → Swift Product Review → set Status to approved."
  )
  console.log(
    "After approval, registered webhooks (or the hourly cron) recompute product aggregates."
  )

  console.log("\n--- Required permissions ---")
  console.log("Admin API scopes:")
  console.log(
    "  read/write_metaobject_definitions, read/write_metaobjects,"
  )
  console.log("  read/write_products, read/write_customers,")
  console.log("  read_orders, read/write_files")
  console.log("Storefront API:")
  console.log(
    "  Product metafields swift.review_rating / review_count / review_breakdown → Storefront Read"
  )
  console.log(
    "  (Metaobject swift_product_review stays Admin-only — do NOT enable Storefront read)"
  )
  console.log("Webhooks (registered by this script):")
  console.log(
    `  METAOBJECTS_CREATE / UPDATE / DELETE → ${reviewWebhookUri()}`
  )
  console.log(`  filter ${REVIEW_WEBHOOK_FILTER}`)

  console.log("\nDone.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
