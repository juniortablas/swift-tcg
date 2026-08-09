/**
 * Storefront account domain types (mapped from Customer Account API).
 */

export type AccountMoney = {
  amount: string
  currencyCode: string
}

export type AccountCustomer = {
  id: string
  displayName: string
  firstName: string | null
  lastName: string | null
  email: string | null
  defaultAddressId: string | null
}

export type AccountAddress = {
  id: string
  firstName: string | null
  lastName: string | null
  company: string | null
  address1: string | null
  address2: string | null
  city: string | null
  province: string | null
  zoneCode: string | null
  zip: string | null
  country: string | null
  territoryCode: string | null
  phoneNumber: string | null
  formatted: string[]
  isDefault: boolean
}

export type AccountOrderLine = {
  id: string
  name: string
  quantity: number
  imageUrl: string | null
  totalPrice: AccountMoney | null
  variantTitle: string | null
}

export type AccountOrderSummary = {
  id: string
  name: string
  processedAt: string
  financialStatus: string | null
  fulfillmentStatus: string
  totalPrice: AccountMoney
  statusPageUrl: string
}

export type AccountOrderDetail = AccountOrderSummary & {
  email: string | null
  subtotal: AccountMoney | null
  totalShipping: AccountMoney
  totalTax: AccountMoney | null
  totalRefunded: AccountMoney
  shippingAddress: AccountAddress | null
  billingAddress: AccountAddress | null
  lineItems: AccountOrderLine[]
}

export type AccountAddressInput = {
  firstName?: string
  lastName?: string
  company?: string
  address1?: string
  address2?: string
  city?: string
  zoneCode?: string
  zip?: string
  territoryCode?: string
  phoneNumber?: string
}
