/**
 * Ensure the CUSTOMER wishlist metafield definition exists.
 *
 * Usage:
 *   npm run setup:wishlist
 *   npm run setup:wishlist -- --dry-run
 *
 * Creates merchant-owned `swift.wishlist` (list.product_reference) on CUSTOMER.
 *
 * Customer Account API access for merchant-owned definitions must be enabled
 * in Admin (Settings → Custom data → Customers → Wishlist → Customer account
 * access → Read and write). Until that is set, the storefront automatically
 * falls back to Admin API metafield writes (requires read_customers /
 * write_customers on the Dev Dashboard app).
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { shopifyAdminFetch } from "../lib/shopify/admin"
import { ShopifyClientError } from "../lib/shopify/client"
import {
  WISHLIST_KEY,
  WISHLIST_METAFIELD_TYPE,
  WISHLIST_NAMESPACE,
} from "../lib/wishlist/constants"

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

async function fetchDefinition(): Promise<DefinitionNode | null> {
  const data = await shopifyAdminFetch<{
    metafieldDefinitions: { nodes: DefinitionNode[] }
  }>({
    query: /* GraphQL */ `
      query WishlistMetafieldDefinition(
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
      ownerType: "CUSTOMER",
      namespace: WISHLIST_NAMESPACE,
      key: WISHLIST_KEY,
    },
  })

  return data.metafieldDefinitions.nodes[0] ?? null
}

async function createDefinition(): Promise<void> {
  if (DRY_RUN) {
    console.log(
      `  [DRY_RUN] Would create CUSTOMER metafield ${WISHLIST_NAMESPACE}.${WISHLIST_KEY}`
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
        mutation CreateWishlistMetafield($definition: MetafieldDefinitionInput!) {
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
          name: "Wishlist",
          namespace: WISHLIST_NAMESPACE,
          key: WISHLIST_KEY,
          description:
            "Saved product wishlist for Swift TCG headless storefront (product GIDs).",
          type: WISHLIST_METAFIELD_TYPE,
          ownerType: "CUSTOMER",
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
      console.log(`  Already exists: ${WISHLIST_NAMESPACE}.${WISHLIST_KEY}`)
      return
    }

    console.log(
      `  Created definition: ${WISHLIST_NAMESPACE}.${WISHLIST_KEY} (${WISHLIST_METAFIELD_TYPE})`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/access denied/i.test(message)) {
      printAccessDeniedHelp()
      throw new ShopifyClientError(
        "Missing Admin scope write_customers (required to create CUSTOMER metafield definitions)."
      )
    }
    throw error
  }
}

function printAccessDeniedHelp(): void {
  console.log("")
  console.log("  Access denied — the Dev Dashboard app cannot create CUSTOMER metafields.")
  console.log("")
  console.log("  Option A (recommended): add scopes, then re-run")
  console.log("    1. Dev Dashboard → your app → API access / Scopes")
  console.log("    2. Enable: read_customers, write_customers")
  console.log("    3. Reinstall / update the app on the store (scopes only apply after install)")
  console.log("    4. npm run setup:wishlist")
  console.log("")
  console.log("  Option B: create the definition manually in Admin (no API scopes)")
  console.log("    1. Admin → Settings → Custom data → Customers → Add definition")
  console.log('    2. Name: Wishlist')
  console.log(`    3. Namespace and key: ${WISHLIST_NAMESPACE}.${WISHLIST_KEY}`)
  console.log("    4. Type: List of products (product reference list)")
  console.log('    5. Customer account access: Read and write')
  console.log("    6. Save, then re-run: npm run setup:wishlist  (to verify)")
  console.log("")
}

async function main() {
  loadEnvFile(".env.local")
  loadEnvFile(".env")

  console.log("=== Swift TCG wishlist metafield setup ===")
  console.log(
    `Target: CUSTOMER ${WISHLIST_NAMESPACE}.${WISHLIST_KEY} (${WISHLIST_METAFIELD_TYPE})`
  )
  if (DRY_RUN) console.log("Mode: DRY RUN\n")

  let node: DefinitionNode | null = null
  try {
    node = await fetchDefinition()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/access denied/i.test(message)) {
      printAccessDeniedHelp()
      throw new ShopifyClientError(
        "Missing Admin scope read_customers (required to read CUSTOMER metafield definitions)."
      )
    }
    throw error
  }

  if (!node) {
    await createDefinition()
    node = DRY_RUN ? null : await fetchDefinition()
  } else {
    console.log(`  Found existing: ${node.namespace}.${node.key}`)
  }

  if (DRY_RUN && !node) {
    console.log("\nDone (dry run).")
    return
  }

  if (!node) {
    throw new ShopifyClientError(
      "Wishlist metafield definition missing after create."
    )
  }

  if (node.type.name !== WISHLIST_METAFIELD_TYPE) {
    console.warn(
      `  Warning: type is ${node.type.name}, expected ${WISHLIST_METAFIELD_TYPE}.`
    )
  }

  const caAccess = node.access.customerAccount
  if (caAccess === "READ_WRITE" || caAccess === "read_write") {
    console.log("  Customer Account access: READ_WRITE ✓")
  } else {
    console.log("")
    console.log("  ACTION REQUIRED (merchant-owned definition):")
    console.log(
      "  Admin → Settings → Custom data → Customers → Wishlist"
    )
    console.log(
      '  → Customer account access → set to "Read and write"'
    )
    console.log(
      "  Until then, the storefront uses Admin API metafield writes as fallback"
    )
    console.log(
      "  (requires Admin scopes read_customers + write_customers)."
    )
    console.log(`  Current customerAccount access: ${caAccess ?? "none"}`)
  }

  console.log("\nDone.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
