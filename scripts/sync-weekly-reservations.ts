/**
 * One-time migration: initialize `custom.current_weekly_reservations`
 * from outstanding weekly restock orders.
 *
 * Usage:
 *   npm run sync:weekly-reservations
 *   npm run sync:weekly-reservations -- --dry-run
 *
 * After this runs, the storefront never scans Shopify orders for remaining
 * reservation counts. Webhooks keep the metafield in sync.
 *
 * Requires Admin scopes: read_products, write_products, read_orders.
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { shopifyAdminFetch } from "../lib/shopify/admin"
import { ShopifyClientError } from "../lib/shopify/client"
import { initializeProductReservationCounter } from "../lib/shopify/weeklyRestockCounter"
import {
  parseBooleanMetafield,
  parseIntegerMetafield,
  shopifyNumericId,
  WEEKLY_RESTOCK_ATTRIBUTE,
  WEEKLY_RESTOCK_COUNT_KEY,
  WEEKLY_RESTOCK_KEY,
  WEEKLY_RESTOCK_NAMESPACE,
} from "../lib/product/weeklyRestock"

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

type Attribute = { key?: string | null; value?: string | null }

type ReservationLine = {
  currentQuantity?: number | null
  unfulfilledQuantity?: number | null
  quantity?: number | null
  customAttributes?: Attribute[] | null
  product?: { id?: string | null } | null
}

type ReservationOrder = {
  id: string
  cancelledAt?: string | null
  displayFinancialStatus?: string | null
  customAttributes?: Attribute[] | null
  lineItems: { nodes: ReservationLine[] }
}

type OrdersQueryResult = {
  orders: {
    pageInfo: { hasNextPage: boolean; endCursor?: string | null }
    nodes: ReservationOrder[]
  }
}

type ProductNode = {
  id: string
  title: string
  handle: string
  allowWeeklyRestock?: { value?: string | null } | null
  weeklyRestockLimit?: { value?: string | null } | null
}

type ProductsQueryResult = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor?: string | null }
    nodes: ProductNode[]
  }
}

const ORDERS_QUERY = /* GraphQL */ `
  query WeeklyRestockReservationOrders($query: String!, $cursor: String) {
    orders(first: 100, after: $cursor, query: $query) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        cancelledAt
        displayFinancialStatus
        customAttributes {
          key
          value
        }
        lineItems(first: 100) {
          nodes {
            currentQuantity
            unfulfilledQuantity
            quantity
            customAttributes {
              key
              value
            }
            product {
              id
            }
          }
        }
      }
    }
  }
`

function hasWeeklyRestockAttribute(
  attributes: Attribute[] | null | undefined
): boolean {
  return (
    attributes?.some(
      (attribute) =>
        attribute.key === WEEKLY_RESTOCK_ATTRIBUTE &&
        attribute.value === "true"
    ) === true
  )
}

function lineReservedQuantity(line: ReservationLine): number {
  const unfulfilled = line.unfulfilledQuantity
  if (typeof unfulfilled === "number" && Number.isFinite(unfulfilled)) {
    return Math.max(0, unfulfilled)
  }
  const current = line.currentQuantity
  if (typeof current === "number" && Number.isFinite(current)) {
    return Math.max(0, current)
  }
  const quantity = line.quantity
  if (typeof quantity === "number" && Number.isFinite(quantity)) {
    return Math.max(0, quantity)
  }
  return 0
}

function countReservedInOrder(
  order: ReservationOrder,
  productId: string
): number {
  if (order.cancelledAt) return 0
  const financial = order.displayFinancialStatus?.toUpperCase() ?? ""
  if (financial === "REFUNDED" || financial === "VOIDED") return 0

  const matching = order.lineItems.nodes.filter(
    (line) => line.product?.id === productId
  )
  if (matching.length === 0) return 0

  const taggedLines = matching.filter((line) =>
    hasWeeklyRestockAttribute(line.customAttributes)
  )
  if (taggedLines.length > 0) {
    return taggedLines.reduce((sum, line) => sum + lineReservedQuantity(line), 0)
  }

  if (!hasWeeklyRestockAttribute(order.customAttributes)) return 0
  return matching.reduce((sum, line) => sum + lineReservedQuantity(line), 0)
}

async function fetchReservedByOrder(
  productId: string
): Promise<Record<string, number>> {
  const numericId = shopifyNumericId(productId)
  if (!numericId) return {}

  const query = `product_id:${numericId} -status:cancelled`
  let cursor: string | null = null
  let hasNextPage = true
  const byOrder: Record<string, number> = {}

  while (hasNextPage) {
    const data: OrdersQueryResult = await shopifyAdminFetch<OrdersQueryResult>({
      query: ORDERS_QUERY,
      variables: { query, ...(cursor ? { cursor } : {}) },
    })

    for (const order of data.orders.nodes) {
      const qty = countReservedInOrder(order, productId)
      if (qty > 0) byOrder[order.id] = qty
    }

    hasNextPage = data.orders.pageInfo.hasNextPage
    cursor = data.orders.pageInfo.endCursor ?? null
  }

  return byOrder
}

async function listWeeklyRestockProducts(): Promise<ProductNode[]> {
  const products: ProductNode[] = []
  let cursor: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    const data: ProductsQueryResult = await shopifyAdminFetch<ProductsQueryResult>({
      query: /* GraphQL */ `
        query WeeklyRestockProducts($cursor: String) {
          products(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              title
              handle
              allowWeeklyRestock: metafield(
                namespace: "${WEEKLY_RESTOCK_NAMESPACE}"
                key: "${WEEKLY_RESTOCK_KEY}"
              ) {
                value
              }
              weeklyRestockLimit: metafield(
                namespace: "${WEEKLY_RESTOCK_NAMESPACE}"
                key: "weekly_restock_limit"
              ) {
                value
              }
            }
          }
        }
      `,
      variables: cursor ? { cursor } : {},
    })

    for (const node of data.products.nodes) {
      if (parseBooleanMetafield(node.allowWeeklyRestock?.value)) {
        products.push(node)
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage
    cursor = data.products.pageInfo.endCursor ?? null
  }

  return products
}

async function ensureCounterDefinition(): Promise<void> {
  const data = await shopifyAdminFetch<{
    metafieldDefinitions: {
      nodes: Array<{ id: string; access: { storefront: string | null } }>
    }
  }>({
    query: /* GraphQL */ `
      query WeeklyRestockCounterDefinition(
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
            access {
              storefront
            }
          }
        }
      }
    `,
    variables: {
      ownerType: "PRODUCT",
      namespace: WEEKLY_RESTOCK_NAMESPACE,
      key: WEEKLY_RESTOCK_COUNT_KEY,
    },
  })

  const existing = data.metafieldDefinitions.nodes[0]
  if (existing) {
    if (existing.access.storefront === "PUBLIC_READ") return
    await shopifyAdminFetch<{
      metafieldDefinitionUpdate: { userErrors: UserError[] }
    }>({
      query: /* GraphQL */ `
        mutation UpdateWeeklyRestockCounter(
          $definition: MetafieldDefinitionUpdateInput!
        ) {
          metafieldDefinitionUpdate(definition: $definition) {
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        definition: {
          namespace: WEEKLY_RESTOCK_NAMESPACE,
          key: WEEKLY_RESTOCK_COUNT_KEY,
          ownerType: "PRODUCT",
          access: { storefront: "PUBLIC_READ" },
        },
      },
    })
    console.log("  Enabled Storefront read on custom.current_weekly_reservations")
    return
  }

  const created = await shopifyAdminFetch<{
    metafieldDefinitionCreate: {
      createdDefinition: { id: string } | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation CreateWeeklyRestockCounter(
        $definition: MetafieldDefinitionInput!
      ) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      definition: {
        name: "Current Weekly Reservations",
        namespace: WEEKLY_RESTOCK_NAMESPACE,
        key: WEEKLY_RESTOCK_COUNT_KEY,
        description:
          "Outstanding paid weekly restock reservations. Maintained automatically from orders.",
        type: "number_integer",
        ownerType: "PRODUCT",
        pin: true,
        access: { storefront: "PUBLIC_READ" },
      },
    },
  })

  const errors = created.metafieldDefinitionCreate.userErrors
  if (errors.length) {
    const taken = errors.some((error) => /taken|already|exists/i.test(error.message))
    if (!taken) {
      throw new ShopifyClientError(
        `metafieldDefinitionCreate: ${errors.map((error) => error.message).join("; ")}`
      )
    }
    console.log("  Definition already exists: custom.current_weekly_reservations")
    return
  }

  console.log("  Created definition: custom.current_weekly_reservations (Storefront PUBLIC_READ)")
}

async function main(): Promise<void> {
  console.log(
    DRY_RUN
      ? "Sync weekly restock counters (dry run)\n"
      : "Sync weekly restock counters\n"
  )

  if (!DRY_RUN) {
    await ensureCounterDefinition()
  } else {
    console.log("  [DRY_RUN] Skipping metafield definition ensure")
  }

  const products = await listWeeklyRestockProducts()
  console.log(`  Found ${products.length} product(s) with allow_weekly_restock`)

  let written = 0
  for (const product of products) {
    const byOrder = await fetchReservedByOrder(product.id)
    const reserved = Object.values(byOrder).reduce((sum, qty) => sum + qty, 0)
    const limit = parseIntegerMetafield(product.weeklyRestockLimit?.value)
    const label = `${product.handle} (${product.id})`

    if (DRY_RUN) {
      console.log(
        `  [DRY_RUN] ${label}: ${reserved} reserved / ${limit} limit (${Object.keys(byOrder).length} open order(s))`
      )
      continue
    }

    const result = await initializeProductReservationCounter({
      productId: product.id,
      orderQuantities: byOrder,
    })
    written += 1
    console.log(
      `  Wrote ${label}: ${result.reserved} reserved / ${result.limit} limit`
    )
  }

  console.log(
    DRY_RUN
      ? `\nDry run complete. ${products.length} product(s) would be updated.`
      : `\nDone. Initialized ${written} product counter(s). Runtime will not scan orders again.`
  )
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nFailed: ${message}`)
  process.exitCode = 1
})
