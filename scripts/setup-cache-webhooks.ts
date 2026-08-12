/**
 * Register Shopify webhooks for Next.js Data Cache invalidation.
 *
 * Usage:
 *   npm run setup:cache-webhooks
 *   npm run setup:cache-webhooks -- --dry-run
 *
 * Creates / verifies subscriptions → POST /api/webhooks/cache
 *
 * Topics:
 *   PRODUCTS_CREATE / UPDATE / DELETE          (no filter)
 *   COLLECTIONS_CREATE / UPDATE / DELETE       (no filter)
 *   INVENTORY_LEVELS_UPDATE                   (no filter)
 *   METAOBJECTS_CREATE / UPDATE / DELETE       (required type:… filter)
 *   SHOP_UPDATE                              (no filter)
 *
 * Why METAOBJECTS_* need a filter:
 *   Shopify requires `metaobjects/create|update|delete` subscriptions to
 *   include a delivery filter of the form `type:{definition_type}`.
 *   Omitting the filter (or using `type:*`) fails with:
 *   "The specified filter is invalid, please ensure you specify the field(s)
 *   you wish to filter on."
 *   See: https://shopify.dev/docs/apps/build/webhooks/delivery-filtering
 *
 * Required Admin scope: write_webhooks (or manage webhooks via Dev Dashboard app).
 * HMAC uses SHOPIFY_WEBHOOK_SECRET or SHOPIFY_CLIENT_SECRET.
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { shopifyAdminFetch } from "../lib/shopify/admin"
import { ShopifyClientError } from "../lib/shopify/client"
import {
  STOREFRONT_CMS_METAOBJECT_TYPES,
  storefrontCmsWebhookFilter,
} from "../lib/shopify/cmsMetaobjectTypes"

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

loadEnvFile(".env.local")
loadEnvFile(".env")

const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "1"

type UserError = { field?: string[] | null; message: string; code?: string | null }

/** Topics that do not accept / need a delivery filter. */
const UNFILTERED_TOPICS = [
  "PRODUCTS_CREATE",
  "PRODUCTS_UPDATE",
  "PRODUCTS_DELETE",
  "COLLECTIONS_CREATE",
  "COLLECTIONS_UPDATE",
  "COLLECTIONS_DELETE",
  "INVENTORY_LEVELS_UPDATE",
  "SHOP_UPDATE",
] as const

/**
 * Metaobject topics — Shopify requires `filter: "type:…"`.
 * Wildcards (`type:*`) and omitted filters are rejected.
 */
const METAOBJECT_TOPICS = [
  "METAOBJECTS_CREATE",
  "METAOBJECTS_UPDATE",
  "METAOBJECTS_DELETE",
] as const

type UnfilteredTopic = (typeof UNFILTERED_TOPICS)[number]
type MetaobjectTopic = (typeof METAOBJECT_TOPICS)[number]
type CacheWebhookTopic = UnfilteredTopic | MetaobjectTopic

const DEFAULT_ORIGIN = "https://www.swifttcg.com"
const CACHE_WEBHOOK_PATH = "/api/webhooks/cache"

function cacheWebhookUri(): string {
  const origin = (
    process.env.SHOPIFY_APP_URL?.trim() || DEFAULT_ORIGIN
  ).replace(/\/$/, "")
  return `${origin}${CACHE_WEBHOOK_PATH}`
}

type ExistingWebhook = {
  id: string
  topic: string
  filter: string | null
  callbackUrl: string | null
}

function assertNoUserErrors(label: string, errors: UserError[] | undefined) {
  if (!errors?.length) return
  throw new ShopifyClientError(
    `${label}: ${errors.map((e) => e.message).join("; ")}`
  )
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "").toLowerCase()
}

/** Normalize filter whitespace so OR-joined type lists compare stably. */
function normalizeFilter(filter: string | null | undefined): string {
  return (filter ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+OR\s+/gi, " OR ")
}

async function listWebhooks(): Promise<ExistingWebhook[]> {
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
      query CacheWebhookSubscriptions($first: Int!) {
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
  topic: CacheWebhookTopic,
  uri: string,
  expectedFilter: string | null
): boolean {
  const target = normalizeUrl(uri)
  const expected = normalizeFilter(expectedFilter)
  return existing.some((hook) => {
    if (hook.topic !== topic) return false
    if (!hook.callbackUrl || normalizeUrl(hook.callbackUrl) !== target) {
      return false
    }
    return normalizeFilter(hook.filter) === expected
  })
}

async function createWebhook(
  topic: CacheWebhookTopic,
  uri: string,
  filter: string | null
): Promise<void> {
  const webhookSubscription: {
    uri: string
    format: string
    filter?: string
  } = {
    uri,
    format: "JSON",
  }
  if (filter) {
    webhookSubscription.filter = filter
  }

  const data = await shopifyAdminFetch<{
    webhookSubscriptionCreate: {
      webhookSubscription: {
        id: string
        topic: string
        filter?: string | null
        uri?: string | null
      } | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation CacheWebhookCreate(
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
            filter
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
      webhookSubscription,
    },
  })

  assertNoUserErrors(
    `webhookSubscriptionCreate(${topic})`,
    data.webhookSubscriptionCreate.userErrors
  )
}

async function ensureTopic(
  existing: ExistingWebhook[],
  topic: CacheWebhookTopic,
  uri: string,
  filter: string | null
): Promise<void> {
  if (webhookAlreadyExists(existing, topic, uri, filter)) {
    console.log(
      filter
        ? `  Verified webhook: ${topic} (filter: ${filter})`
        : `  Verified webhook: ${topic}`
    )
    return
  }

  if (DRY_RUN) {
    console.log(
      filter
        ? `  [DRY_RUN] Would create webhook: ${topic} → ${uri}\n            filter: ${filter}`
        : `  [DRY_RUN] Would create webhook: ${topic} → ${uri}`
    )
    return
  }

  try {
    await createWebhook(topic, uri, filter)
    console.log(
      filter
        ? `  Created webhook: ${topic} (filter: ${filter})`
        : `  Created webhook: ${topic}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/taken|already|exists/i.test(message)) {
      console.log(`  Exists (race): ${topic}`)
      return
    }
    throw error
  }
}

async function ensureCacheWebhooks(): Promise<void> {
  const uri = cacheWebhookUri()
  const cmsFilter = storefrontCmsWebhookFilter()
  console.log(`  Target: ${uri}`)
  console.log(`  CMS types: ${STOREFRONT_CMS_METAOBJECT_TYPES.join(", ")}`)
  console.log(`  CMS filter: ${cmsFilter}`)

  let existing: ExistingWebhook[] = []
  try {
    existing = await listWebhooks()
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

  for (const topic of UNFILTERED_TOPICS) {
    await ensureTopic(existing, topic, uri, null)
  }

  for (const topic of METAOBJECT_TOPICS) {
    await ensureTopic(existing, topic, uri, cmsFilter)
  }
}

async function main() {
  console.log("Swift TCG — cache invalidation webhooks\n")
  if (DRY_RUN) console.log("Mode: DRY RUN\n")

  console.log("Registering Data Cache webhooks…")
  await ensureCacheWebhooks()

  console.log("\nDone.")
  console.log(
    `  PRODUCTS / COLLECTIONS / INVENTORY / SHOP → ${cacheWebhookUri()}`
  )
  console.log(
    `  METAOBJECTS (CMS types only) → ${cacheWebhookUri()}`
  )
  console.log(
    "  Tags: shopify-catalog, storefront-cms, shopify-chrome, shopify-policies"
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
