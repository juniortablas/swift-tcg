/**
 * Map Customer Account API payloads into storefront account types.
 */

import type {
  AccountAddress,
  AccountCustomer,
  AccountMoney,
  AccountOrderDetail,
  AccountOrderLine,
  AccountOrderSummary,
} from "@/types/account"

type MoneyNode = { amount: string; currencyCode: string } | null | undefined

type AddressNode = {
  id: string
  firstName?: string | null
  lastName?: string | null
  company?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  province?: string | null
  zoneCode?: string | null
  zip?: string | null
  country?: string | null
  territoryCode?: string | null
  phoneNumber?: string | null
  formatted?: string[] | null
} | null | undefined

type OrderSummaryNode = {
  id: string
  name: string
  processedAt: string
  financialStatus?: string | null
  fulfillmentStatus: string
  statusPageUrl: string
  totalPrice: { amount: string; currencyCode: string }
}

function mapMoney(node: MoneyNode): AccountMoney | null {
  if (!node?.amount || !node.currencyCode) return null
  return { amount: node.amount, currencyCode: node.currencyCode }
}

export function mapAddress(
  node: AddressNode,
  defaultAddressId?: string | null
): AccountAddress | null {
  if (!node?.id) return null
  return {
    id: node.id,
    firstName: node.firstName ?? null,
    lastName: node.lastName ?? null,
    company: node.company ?? null,
    address1: node.address1 ?? null,
    address2: node.address2 ?? null,
    city: node.city ?? null,
    province: node.province ?? null,
    zoneCode: node.zoneCode ?? null,
    zip: node.zip ?? null,
    country: node.country ?? null,
    territoryCode: node.territoryCode ?? null,
    phoneNumber: node.phoneNumber ?? null,
    formatted: node.formatted ?? [],
    isDefault: Boolean(defaultAddressId && node.id === defaultAddressId),
  }
}

export function mapCustomer(node: {
  id: string
  displayName: string
  firstName?: string | null
  lastName?: string | null
  emailAddress?: { emailAddress?: string | null } | null
  defaultAddress?: { id?: string | null } | null
}): AccountCustomer {
  return {
    id: node.id,
    displayName: node.displayName,
    firstName: node.firstName ?? null,
    lastName: node.lastName ?? null,
    email: node.emailAddress?.emailAddress ?? null,
    defaultAddressId: node.defaultAddress?.id ?? null,
  }
}

export function mapOrderSummary(node: OrderSummaryNode): AccountOrderSummary {
  return {
    id: node.id,
    name: node.name,
    processedAt: node.processedAt,
    financialStatus: node.financialStatus ?? null,
    fulfillmentStatus: node.fulfillmentStatus,
    statusPageUrl: node.statusPageUrl,
    totalPrice: {
      amount: node.totalPrice.amount,
      currencyCode: node.totalPrice.currencyCode,
    },
  }
}

export function mapOrderLine(node: {
  id: string
  name: string
  quantity: number
  variantTitle?: string | null
  image?: { url?: string | null } | null
  totalPrice?: MoneyNode
}): AccountOrderLine {
  return {
    id: node.id,
    name: node.name,
    quantity: node.quantity,
    variantTitle: node.variantTitle ?? null,
    imageUrl: node.image?.url ?? null,
    totalPrice: mapMoney(node.totalPrice),
  }
}

export function mapOrderDetail(node: {
  id: string
  name: string
  processedAt: string
  financialStatus?: string | null
  fulfillmentStatus: string
  statusPageUrl: string
  email?: string | null
  totalPrice: { amount: string; currencyCode: string }
  subtotal?: MoneyNode
  totalShipping: { amount: string; currencyCode: string }
  totalTax?: MoneyNode
  totalRefunded: { amount: string; currencyCode: string }
  shippingAddress?: AddressNode
  billingAddress?: AddressNode
  lineItems?: { nodes?: Array<Parameters<typeof mapOrderLine>[0]> }
}): AccountOrderDetail {
  return {
    ...mapOrderSummary(node),
    email: node.email ?? null,
    subtotal: mapMoney(node.subtotal),
    totalShipping: {
      amount: node.totalShipping.amount,
      currencyCode: node.totalShipping.currencyCode,
    },
    totalTax: mapMoney(node.totalTax),
    totalRefunded: {
      amount: node.totalRefunded.amount,
      currencyCode: node.totalRefunded.currencyCode,
    },
    shippingAddress: mapAddress(node.shippingAddress),
    billingAddress: mapAddress(node.billingAddress),
    lineItems: (node.lineItems?.nodes ?? []).map(mapOrderLine),
  }
}
