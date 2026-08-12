/**
 * Ensure Back in Stock metafield definitions exist.
 *
 * Usage:
 *   npm run setup:back-in-stock
 *   npm run setup:back-in-stock -- --dry-run
 *
 * Creates:
 *   CUSTOMER  swift.back_in_stock       (json)
 *   PRODUCT   swift.bis_subscribers     (json)
 *   SHOP      swift.bis_watched_products (json)
 *
 * Customer Account API access for the customer definition must be enabled
 * in Admin (Settings → Custom data → Customers → Back in Stock → Customer
 * account access → Read and write). Until then, the storefront falls back
 * to Admin API customer metafield writes.
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { shopifyAdminFetch } from "../lib/shopify/admin"
import { ShopifyClientError } from "../lib/shopify/client"
import {
  BIS_CUSTOMER_KEY,
  BIS_CUSTOMER_METAFIELD_TYPE,
  BIS_NAMESPACE,
  BIS_PRODUCT_KEY,
  BIS_PRODUCT_METAFIELD_TYPE,
  BIS_SHOP_KEY,
  BIS_SHOP_METAFIELD_TYPE,
} from "../lib/back-in-stock/constants"

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

type DefinitionNode = {
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

type DefinitionSpec = {
  name: string
  ownerType: "CUSTOMER" | "PRODUCT" | "SHOP"
  key: string
  type: string
  description: string
}

const DEFINITIONS: DefinitionSpec[] = [
  {
    name: "Back in Stock",
    ownerType: "CUSTOMER",
    key: BIS_CUSTOMER_KEY,
    type: BIS_CUSTOMER_METAFIELD_TYPE,
    description:
      "Customer back-in-stock alert subscriptions for Swift TCG (JSON: productId + subscribedAt).",
  },
  {
    name: "Back in Stock Subscribers",
    ownerType: "PRODUCT",
    key: BIS_PRODUCT_KEY,
    type: BIS_PRODUCT_METAFIELD_TYPE,
    description:
      "Reverse index of customers waiting for this product (JSON: customerId + subscribedAt).",
  },
  {
    name: "Back in Stock Watched Products",
    ownerType: "SHOP",
    key: BIS_SHOP_KEY,
    type: BIS_SHOP_METAFIELD_TYPE,
    description:
      "Product GIDs with at least one active back-in-stock subscriber (cron scope).",
  },
]

async function fetchDefinition(
  ownerType: DefinitionSpec["ownerType"],
  key: string
): Promise<DefinitionNode | null> {
  const data = await shopifyAdminFetch<{
    metafieldDefinitions: { nodes: DefinitionNode[] }
  }>({
    query: /* GraphQL */ `
      query BisMetafieldDefinition(
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
    variables: {
      ownerType,
      namespace: BIS_NAMESPACE,
      key,
    },
  })

  return data.metafieldDefinitions.nodes[0] ?? null
}

async function createDefinition(spec: DefinitionSpec): Promise<void> {
  if (DRY_RUN) {
    console.log(
      `  [DRY_RUN] Would create ${spec.ownerType} metafield ${BIS_NAMESPACE}.${spec.key}`
    )
    return
  }

  try {
    const data = await shopifyAdminFetch<{
      metafieldDefinitionCreate: {
        createdDefinition: { id: string; namespace: string; key: string } | null
        userErrors: UserError[]
      }
    }>({
      query: /* GraphQL */ `
        mutation CreateBisMetafield($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              namespace
              key
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
          name: spec.name,
          namespace: BIS_NAMESPACE,
          key: spec.key,
          description: spec.description,
          type: spec.type,
          ownerType: spec.ownerType,
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
          `metafieldDefinitionCreate: ${errors.map((e) => e.message).join("; ")}`
        )
      }
      console.log(`  Already exists: ${BIS_NAMESPACE}.${spec.key}`)
      return
    }

    console.log(
      `  Created definition: ${spec.ownerType} ${BIS_NAMESPACE}.${spec.key} (${spec.type})`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/access denied/i.test(message)) {
      printAccessDeniedHelp(spec.ownerType)
      throw new ShopifyClientError(
        `Missing Admin scopes required to create ${spec.ownerType} metafield definitions.`
      )
    }
    throw error
  }
}

function printAccessDeniedHelp(ownerType: string): void {
  console.log("")
  console.log(`  Access denied — cannot create ${ownerType} metafields.`)
  console.log("")
  console.log("  Dev Dashboard → your app → API access / Scopes")
  console.log("    Enable: read_customers, write_customers, read_products, write_products")
  console.log("  Then reinstall / update the app on the store and re-run:")
  console.log("    npm run setup:back-in-stock")
  console.log("")
}

async function ensureDefinition(spec: DefinitionSpec): Promise<DefinitionNode | null> {
  console.log(`\n→ ${spec.ownerType} ${BIS_NAMESPACE}.${spec.key}`)

  let node: DefinitionNode | null = null
  try {
    node = await fetchDefinition(spec.ownerType, spec.key)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/access denied/i.test(message)) {
      printAccessDeniedHelp(spec.ownerType)
      throw new ShopifyClientError(
        `Missing Admin scope to read ${spec.ownerType} metafield definitions.`
      )
    }
    throw error
  }

  if (!node) {
    await createDefinition(spec)
    node = DRY_RUN ? null : await fetchDefinition(spec.ownerType, spec.key)
  } else {
    console.log(`  Found existing: ${node.namespace}.${node.key}`)
  }

  if (!node) return null

  if (node.type.name !== spec.type) {
    console.warn(`  Warning: type is ${node.type.name}, expected ${spec.type}.`)
  }

  if (spec.ownerType === "CUSTOMER") {
    const caAccess = node.access.customerAccount
    if (caAccess === "READ_WRITE" || caAccess === "read_write") {
      console.log("  Customer Account access: READ_WRITE ✓")
    } else {
      console.log("")
      console.log("  ACTION REQUIRED (merchant-owned definition):")
      console.log(
        "  Admin → Settings → Custom data → Customers → Back in Stock"
      )
      console.log(
        '  → Customer account access → set to "Read and write"'
      )
      console.log(
        "  Until then, the storefront uses Admin API metafield writes as fallback."
      )
      console.log(`  Current customerAccount access: ${caAccess ?? "none"}`)
    }
  }

  return node
}

async function main() {
  loadEnvFile(".env.local")
  loadEnvFile(".env")

  console.log("=== Swift TCG back-in-stock metafield setup ===")
  if (DRY_RUN) console.log("Mode: DRY RUN")

  for (const spec of DEFINITIONS) {
    await ensureDefinition(spec)
  }

  console.log("\nAlso configure:")
  console.log("  RESEND_API_KEY=…")
  console.log("  BACK_IN_STOCK_FROM_EMAIL=Swift TCG <noreply@your-domain.com>")
  console.log("  CRON_SECRET=…  (Vercel Cron Authorization bearer)")
  console.log("\nDone.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
