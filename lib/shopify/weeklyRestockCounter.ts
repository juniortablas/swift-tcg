/**
 * Persist weekly restock reservation counts on product metafields.
 *
 * Storefront remaining is `weekly_restock_limit − current_weekly_reservations`.
 * Order webhooks keep the integer in sync via a per-product ledger so
 * Shopify retries never double-count, and create/update/cancel/refund/fulfill
 * all converge on the same outstanding quantity.
 */

import { ShopifyClientError } from "./client"
import { shopifyAdminFetch } from "./admin"
import {
  WEEKLY_RESTOCK_ATTRIBUTE,
  WEEKLY_RESTOCK_COUNT_KEY,
  WEEKLY_RESTOCK_LEDGER_KEY,
  WEEKLY_RESTOCK_LIMIT_KEY,
  WEEKLY_RESTOCK_NAMESPACE,
  clampReservationCount,
  parseIntegerMetafield,
  parseReservationCounterMetafield,
} from "@/lib/product/weeklyRestock"
import { captureWeeklyRestockFailure } from "./weeklyRestockReservations"

const CAS_ATTEMPTS = 8
const WEBHOOK_ID_LIMIT = 100

type UserError = { field?: string[] | null; message: string; code?: string | null }

type Attribute = {
  key?: string | null
  name?: string | null
  value?: string | null
}

type RestLineItem = {
  product_id?: number | string | null
  fulfillable_quantity?: number | null
  quantity?: number | null
  properties?: Attribute[] | null
}

type RestOrder = {
  id?: number | string
  admin_graphql_api_id?: string | null
  cancelled_at?: string | null
  financial_status?: string | null
  note_attributes?: Attribute[] | null
  line_items?: RestLineItem[] | null
}

type RestRefund = {
  id?: number | string
  order_id?: number | string
  order?: RestOrder | null
}

type AdminLine = {
  currentQuantity?: number | null
  unfulfilledQuantity?: number | null
  quantity?: number | null
  customAttributes?: Attribute[] | null
  product?: { id?: string | null } | null
}

type AdminOrder = {
  id: string
  cancelledAt?: string | null
  displayFinancialStatus?: string | null
  customAttributes?: Attribute[] | null
  lineItems: { nodes: AdminLine[] }
}

type ReservationLedger = {
  orders: Record<string, number>
  webhookIds: string[]
}

type ProductReservationState = {
  productId: string
  limit: number
  reserved: number
  reservedDigest: string | null
  ledger: ReservationLedger
  ledgerDigest: string | null
}

function firstUserError(errors: UserError[] | undefined): string | null {
  return errors?.[0]?.message ?? null
}

function isConflictError(error: unknown): boolean {
  if (error instanceof ShopifyClientError && error.status === 409) return true
  return error instanceof Error && /compareDigest|stale|modified|conflict/i.test(error.message)
}

function hasWeeklyRestockAttribute(
  attributes: Attribute[] | null | undefined
): boolean {
  return (
    attributes?.some(
      (attribute) =>
        (attribute.key === WEEKLY_RESTOCK_ATTRIBUTE ||
          attribute.name === WEEKLY_RESTOCK_ATTRIBUTE) &&
        attribute.value === "true"
    ) === true
  )
}

function orderGid(
  id: string | number | undefined,
  adminGid?: string | null
): string | null {
  const gid = adminGid?.trim()
  if (gid) return gid
  if (id == null || id === "") return null
  return `gid://shopify/Order/${id}`
}

function productGid(productId: string | number | null | undefined): string | null {
  if (productId == null || productId === "") return null
  const asString = String(productId)
  if (asString.startsWith("gid://")) return asString
  return `gid://shopify/Product/${asString}`
}

function lineOutstandingQuantity(line: {
  unfulfilledQuantity?: number | null
  fulfillable_quantity?: number | null
  currentQuantity?: number | null
  quantity?: number | null
}): number {
  const unfulfilled = line.unfulfilledQuantity ?? line.fulfillable_quantity
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

function isFullyClosed(cancelledAt: string | null | undefined, financial: string | null | undefined): boolean {
  if (cancelledAt) return true
  const status = financial?.toUpperCase() ?? ""
  return status === "REFUNDED" || status === "VOIDED"
}

function addOutstanding(
  map: Map<string, number>,
  productId: string,
  quantity: number
): void {
  map.set(productId, (map.get(productId) ?? 0) + quantity)
}

function countableLines<T>(
  productLines: T[],
  orderTagged: boolean,
  lineTagged: (line: T) => boolean
): T[] {
  const tagged = productLines.filter(lineTagged)
  if (tagged.length > 0) return tagged
  return orderTagged ? productLines : []
}

export function outstandingByProductFromRestOrder(
  order: RestOrder
): { orderId: string | null; outstanding: Map<string, number> } {
  const orderId = orderGid(order.id, order.admin_graphql_api_id)
  const outstanding = new Map<string, number>()
  const byProduct = new Map<string, RestLineItem[]>()
  for (const line of order.line_items ?? []) {
    const id = productGid(line.product_id)
    if (!id) continue
    const existing = byProduct.get(id)
    if (existing) existing.push(line)
    else byProduct.set(id, [line])
  }

  const orderTagged = hasWeeklyRestockAttribute(order.note_attributes)
  const closed = isFullyClosed(order.cancelled_at, order.financial_status)
  for (const [productId, productLines] of byProduct) {
    const countable = countableLines(productLines, orderTagged, (line) =>
      hasWeeklyRestockAttribute(line.properties)
    )
    if (countable.length === 0) continue
    if (closed) {
      outstanding.set(productId, 0)
      continue
    }
    for (const line of countable) {
      addOutstanding(outstanding, productId, lineOutstandingQuantity(line))
    }
  }
  return { orderId, outstanding }
}

function outstandingByProductFromAdminOrder(
  order: AdminOrder
): { orderId: string; outstanding: Map<string, number> } {
  const outstanding = new Map<string, number>()
  const byProduct = new Map<string, AdminLine[]>()
  for (const line of order.lineItems.nodes) {
    const id = line.product?.id
    if (!id) continue
    const existing = byProduct.get(id)
    if (existing) existing.push(line)
    else byProduct.set(id, [line])
  }

  const orderTagged = hasWeeklyRestockAttribute(order.customAttributes)
  const closed = isFullyClosed(order.cancelledAt, order.displayFinancialStatus)
  for (const [productId, productLines] of byProduct) {
    const countable = countableLines(productLines, orderTagged, (line) =>
      hasWeeklyRestockAttribute(line.customAttributes)
    )
    if (countable.length === 0) continue
    if (closed) {
      outstanding.set(productId, 0)
      continue
    }
    for (const line of countable) {
      addOutstanding(outstanding, productId, lineOutstandingQuantity(line))
    }
  }
  return { orderId: order.id, outstanding }
}

function emptyLedger(): ReservationLedger {
  return { orders: {}, webhookIds: [] }
}

function parseLedger(value: string | null | undefined): ReservationLedger {
  if (value == null || value.trim() === "") return emptyLedger()
  try {
    const parsed = JSON.parse(value) as Partial<ReservationLedger>
    const orders: Record<string, number> = {}
    if (parsed.orders && typeof parsed.orders === "object") {
      for (const [orderId, qty] of Object.entries(parsed.orders)) {
        if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) {
          orders[orderId] = Math.floor(qty)
        }
      }
    }
    const webhookIds = Array.isArray(parsed.webhookIds)
      ? parsed.webhookIds.filter((id): id is string => typeof id === "string" && id.length > 0)
      : []
    return { orders, webhookIds }
  } catch {
    throw new ShopifyClientError("weekly restock reservation ledger is not valid JSON", 500)
  }
}

function serializeLedger(ledger: ReservationLedger): string {
  const orders: Record<string, number> = {}
  for (const [orderId, qty] of Object.entries(ledger.orders)) {
    if (qty > 0) orders[orderId] = qty
  }
  return JSON.stringify({
    orders,
    webhookIds: ledger.webhookIds.slice(-WEBHOOK_ID_LIMIT),
  })
}

function ledgerSum(ledger: ReservationLedger): number {
  let total = 0
  for (const qty of Object.values(ledger.orders)) {
    total += qty
  }
  return total
}

function rememberWebhookId(ledger: ReservationLedger, webhookId: string): void {
  if (!webhookId) return
  if (ledger.webhookIds.includes(webhookId)) return
  ledger.webhookIds = [...ledger.webhookIds, webhookId].slice(-WEBHOOK_ID_LIMIT)
}

async function metafieldsSet(
  metafields: Array<{
    ownerId: string
    namespace: string
    key: string
    type: string
    value: string
    compareDigest?: string | null
  }>
): Promise<void> {
  const data = await shopifyAdminFetch<{
    metafieldsSet: { userErrors: UserError[] }
  }>({
    query: /* GraphQL */ `
      mutation WeeklyRestockMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: {
      metafields: metafields.map((field) => ({
        ownerId: field.ownerId,
        namespace: field.namespace,
        key: field.key,
        type: field.type,
        value: field.value,
        ...(field.compareDigest ? { compareDigest: field.compareDigest } : {}),
      })),
    },
  })

  const error = firstUserError(data.metafieldsSet.userErrors)
  if (error) {
    const conflict = /compareDigest|stale|modified|conflict/i.test(error)
    throw new ShopifyClientError(error, conflict ? 409 : 400)
  }
}

async function readProductReservationState(
  productId: string
): Promise<ProductReservationState | null> {
  const data = await shopifyAdminFetch<{
    product: {
      id: string
      limit?: { value?: string | null } | null
      reserved?: {
        value?: string | null
        compareDigest?: string | null
      } | null
      ledger?: {
        value?: string | null
        compareDigest?: string | null
      } | null
    } | null
  }>({
    query: /* GraphQL */ `
      query WeeklyRestockProductCounter($id: ID!, $namespace: String!) {
        product(id: $id) {
          id
          limit: metafield(namespace: $namespace, key: "${WEEKLY_RESTOCK_LIMIT_KEY}") {
            value
          }
          reserved: metafield(namespace: $namespace, key: "${WEEKLY_RESTOCK_COUNT_KEY}") {
            value
            compareDigest
          }
          ledger: metafield(namespace: $namespace, key: "${WEEKLY_RESTOCK_LEDGER_KEY}") {
            value
            compareDigest
          }
        }
      }
    `,
    variables: { id: productId, namespace: WEEKLY_RESTOCK_NAMESPACE },
  })

  if (!data.product) return null

  const reserved = parseReservationCounterMetafield(data.product.reserved?.value)
  if (!reserved.ok) {
    throw new ShopifyClientError(
      `weekly restock counter unreadable for ${productId}`,
      500
    )
  }

  return {
    productId: data.product.id,
    limit: parseIntegerMetafield(data.product.limit?.value),
    reserved: reserved.value,
    reservedDigest: data.product.reserved?.compareDigest ?? null,
    ledger: parseLedger(data.product.ledger?.value),
    ledgerDigest: data.product.ledger?.compareDigest ?? null,
  }
}

async function writeProductReservationState(
  state: ProductReservationState
): Promise<void> {
  const reserved = clampReservationCount(ledgerSum(state.ledger), state.limit)
  await metafieldsSet([
    {
      ownerId: state.productId,
      namespace: WEEKLY_RESTOCK_NAMESPACE,
      key: WEEKLY_RESTOCK_COUNT_KEY,
      type: "number_integer",
      value: String(reserved),
      compareDigest: state.reservedDigest,
    },
    {
      ownerId: state.productId,
      namespace: WEEKLY_RESTOCK_NAMESPACE,
      key: WEEKLY_RESTOCK_LEDGER_KEY,
      type: "json",
      value: serializeLedger(state.ledger),
      compareDigest: state.ledgerDigest,
    },
  ])
}

async function applyOrderContribution(input: {
  productId: string
  orderId: string
  outstanding: number
  webhookId: string
}): Promise<boolean> {
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const state = await readProductReservationState(input.productId)
    if (!state) return false

    if (input.webhookId && state.ledger.webhookIds.includes(input.webhookId)) {
      return false
    }

    const next = Math.max(0, Math.floor(input.outstanding))
    if (next > 0) state.ledger.orders[input.orderId] = next
    else delete state.ledger.orders[input.orderId]
    rememberWebhookId(state.ledger, input.webhookId)

    try {
      await writeProductReservationState(state)
      return true
    } catch (error) {
      if (isConflictError(error) && attempt < CAS_ATTEMPTS - 1) continue
      throw error
    }
  }

  throw new ShopifyClientError(
    `weekly restock counter update conflicted for ${input.productId}`,
    409
  )
}

async function fetchAdminOrder(orderId: string): Promise<AdminOrder | null> {
  const data = await shopifyAdminFetch<{ order: AdminOrder | null }>({
    query: /* GraphQL */ `
      query WeeklyRestockOrder($id: ID!) {
        order(id: $id) {
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
    `,
    variables: { id: orderId },
  })
  return data.order
}

function parseRestBody(body: string): RestOrder | RestRefund | null {
  try {
    return JSON.parse(body) as RestOrder | RestRefund
  } catch {
    return null
  }
}

function webhookFallbackId(topic: string, orderId: string | null, body: string): string {
  try {
    const payload = JSON.parse(body) as { id?: number | string; updated_at?: string }
    return [topic, orderId ?? "", String(payload.id ?? ""), payload.updated_at ?? ""].join(":")
  } catch {
    return `${topic}:${orderId ?? ""}`
  }
}

/**
 * Apply an order/refund webhook to product reservation counters.
 * Idempotent on Shopify webhook/event IDs. Returns product GIDs that changed.
 */
export async function syncWeeklyRestockFromWebhook(input: {
  topic: string
  webhookId: string
  body: string
}): Promise<string[]> {
  const topic = input.topic.toLowerCase()
  if (!topic.startsWith("orders/") && !topic.startsWith("refunds/")) {
    return []
  }

  const payload = parseRestBody(input.body)
  if (!payload) return []

  let orderId: string | null = null
  if (topic.startsWith("refunds/")) {
    const refund = payload as RestRefund
    orderId = orderGid(refund.order_id, refund.order?.admin_graphql_api_id)
  } else {
    const preview = outstandingByProductFromRestOrder(payload as RestOrder)
    if (preview.outstanding.size === 0) return []
    orderId = preview.orderId
  }
  if (!orderId) return []

  const order = await fetchAdminOrder(orderId)
  if (!order) return []

  const computed = outstandingByProductFromAdminOrder(order)
  const outstanding = computed.outstanding
  orderId = computed.orderId

  if (outstanding.size === 0) return []

  const webhookId =
    input.webhookId.trim() || webhookFallbackId(topic, orderId, input.body)

  const changed: string[] = []
  for (const [productId, qty] of outstanding) {
    try {
      const wrote = await applyOrderContribution({
        productId,
        orderId,
        outstanding: qty,
        webhookId,
      })
      if (wrote) changed.push(productId)
    } catch (error) {
      captureWeeklyRestockFailure(error, {
        topic,
        webhookId,
        orderId,
        productId,
      })
      throw error
    }
  }

  return changed
}

/**
 * One-shot write used by `npm run sync:weekly-reservations`.
 * Replaces the product ledger and integer counter with scanned order totals.
 */
export async function initializeProductReservationCounter(input: {
  productId: string
  orderQuantities: Record<string, number>
}): Promise<{ reserved: number; limit: number }> {
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const state = await readProductReservationState(input.productId)
    if (!state) {
      throw new ShopifyClientError(`Product not found: ${input.productId}`, 404)
    }

    const orders: Record<string, number> = {}
    for (const [orderId, qty] of Object.entries(input.orderQuantities)) {
      if (qty > 0) orders[orderId] = Math.floor(qty)
    }
    state.ledger = { orders, webhookIds: state.ledger.webhookIds }
    const reserved = clampReservationCount(ledgerSum(state.ledger), state.limit)

    try {
      await writeProductReservationState({ ...state, reserved })
      return { reserved, limit: state.limit }
    } catch (error) {
      if (isConflictError(error) && attempt < CAS_ATTEMPTS - 1) continue
      throw error
    }
  }

  throw new ShopifyClientError(
    `weekly restock counter init conflicted for ${input.productId}`,
    409
  )
}
