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
 *   ORDERS_CREATE / UPDATED / CANCELLED       (no filter)
 *   REFUNDS_CREATE                            (no filter)
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
 *
 * Order / refund destinations:
 *   Shopify will not deliver ORDERS_* or REFUNDS_* to the shop's myshopify
 *   domain or any custom domain attached to the store. SHOPIFY_APP_URL
 *   (https://www.swifttcg.com) stays the catalog / CMS / shop callback and
 *   the customer-facing origin (SEO, OAuth, Customer Accounts).
 *   Restricted topics use SHOPIFY_WEBHOOK_ORIGIN when set:
 *     ${SHOPIFY_WEBHOOK_ORIGIN}/api/webhooks/cache
 *   When unset, those four topics are skipped and the rest still register.
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
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_CANCELLED",
  "REFUNDS_CREATE",
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

const ORDER_REFUND_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_CANCELLED",
  "REFUNDS_CREATE",
] as const satisfies readonly UnfilteredTopic[]

type OrderRefundTopic = (typeof ORDER_REFUND_TOPICS)[number]

const DEFAULT_ORIGIN = "https://www.swifttcg.com"
const CACHE_WEBHOOK_PATH = "/api/webhooks/cache"

function isOrderRefundTopic(topic: CacheWebhookTopic): topic is OrderRefundTopic {
  return (ORDER_REFUND_TOPICS as readonly string[]).includes(topic)
}

function configuredWebhookOrigin(): string | undefined {
  const origin = process.env.SHOPIFY_WEBHOOK_ORIGIN?.trim()
  return origin ? origin.replace(/\/$/, "") : undefined
}

/** Catalog / CMS / shop webhooks — existing subscriptions use this host. */
function cacheWebhookUri(): string {
  const origin = (
    process.env.SHOPIFY_APP_URL?.trim() || DEFAULT_ORIGIN
  ).replace(/\/$/, "")
  return `${origin}${CACHE_WEBHOOK_PATH}`
}

/** Restricted topics only. `undefined` when SHOPIFY_WEBHOOK_ORIGIN is unset. */
function orderRefundWebhookUri(): string | undefined {
  const origin = configuredWebhookOrigin()
  return origin ? `${origin}${CACHE_WEBHOOK_PATH}` : undefined
}

function missingWebhookOriginMessage(): string {
  return [
    "  Skipping ORDERS_CREATE, ORDERS_UPDATED, ORDERS_CANCELLED, REFUNDS_CREATE.",
    "",
    "  Shopify will not deliver order or refund webhooks to the shop's",
    "  myshopify domain or any custom domain attached to the store",
    "  (www.swifttcg.com). SHOPIFY_APP_URL stays https://www.swifttcg.com",
    "  for SEO, canonicals, OAuth, Customer Accounts, robots.txt, sitemap,",
    "  JSON-LD, and customer-facing links.",
    "",
    "  Set SHOPIFY_WEBHOOK_ORIGIN to an HTTPS origin that is not listed",
    "  under Shopify Admin → Settings → Domains (same app, different host),",
    "  then re-run. Catalog, CMS, and shop webhooks are unaffected.",
    "",
    "    SHOPIFY_WEBHOOK_ORIGIN=https://<host-not-on-the-shop> npm run setup:cache-webhooks",
  ].join("\n")
}

type ExistingWebhook = {
  id: string
  topic: string
  filter: string | null
  callbackUrl: string | null
}

function shopDomainDestinationError(message: string): boolean {
  return /address cannot be any of the domains/i.test(message)
}

function assertNoUserErrors(label: string, errors: UserError[] | undefined) {
  if (!errors?.length) return
  const message = errors.map((error) => error.message).join("; ")
  throw new ShopifyClientError(`${label}: ${message}`)
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

async function ensureOrderRefundWebhooks(
  existing: ExistingWebhook[]
): Promise<void> {
  const uri = orderRefundWebhookUri()
  if (!uri) {
    console.log(missingWebhookOriginMessage())
    return
  }

  console.log(`  Order/refund target: ${uri}`)

  for (const topic of ORDER_REFUND_TOPICS) {
    try {
      await ensureTopic(existing, topic, uri, null)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (shopDomainDestinationError(message)) {
        console.error(`  ${message}`)
        console.log(
          "  Skipping remaining ORDERS_* / REFUNDS_* topics.\n" +
            "  SHOPIFY_WEBHOOK_ORIGIN must be an HTTPS host that is not listed\n" +
            "  under Shopify Admin → Settings → Domains. Catalog webhooks are unchanged."
        )
        return
      }
      throw error
    }
  }
}

async function ensureCacheWebhooks(): Promise<void> {
  const catalogUri = cacheWebhookUri()
  const cmsFilter = storefrontCmsWebhookFilter()
  console.log(`  Catalog target: ${catalogUri}`)
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
    if (isOrderRefundTopic(topic)) continue
    await ensureTopic(existing, topic, catalogUri, null)
  }

  for (const topic of METAOBJECT_TOPICS) {
    await ensureTopic(existing, topic, catalogUri, cmsFilter)
  }

  await ensureOrderRefundWebhooks(existing)
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
  const orderUri = orderRefundWebhookUri()
  console.log(
    orderUri
      ? `  ORDERS / REFUNDS → ${orderUri}`
      : "  ORDERS / REFUNDS → skipped (SHOPIFY_WEBHOOK_ORIGIN unset)"
  )
  console.log(
    "  Tags: shopify-catalog, storefront-cms, shopify-chrome, shopify-policies"
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
