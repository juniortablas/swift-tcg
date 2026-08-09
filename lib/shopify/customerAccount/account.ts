/**
 * High-level Customer Account API loaders / mutations for the account area.
 */

import type {
  AccountAddress,
  AccountAddressInput,
  AccountCustomer,
  AccountOrderDetail,
  AccountOrderSummary,
} from "@/types/account"

import { ShopifyClientError } from "../client"
import { customerAccountFetch } from "./client"
import { mapAddress, mapCustomer, mapOrderDetail, mapOrderSummary } from "./mappers"
import {
  CUSTOMER_ADDRESS_CREATE_MUTATION,
  CUSTOMER_ADDRESS_DELETE_MUTATION,
  CUSTOMER_ADDRESS_UPDATE_MUTATION,
  CUSTOMER_ADDRESSES_QUERY,
  CUSTOMER_DASHBOARD_QUERY,
  CUSTOMER_ORDER_QUERY,
  CUSTOMER_ORDERS_QUERY,
  CUSTOMER_PROFILE_QUERY,
  CUSTOMER_UPDATE_MUTATION,
} from "./queries"

type UserError = { field?: string[] | null; message: string; code?: string | null }

function firstUserError(errors: UserError[] | undefined): string | null {
  return errors?.[0]?.message ?? null
}

export async function getCustomerDashboard(): Promise<{
  customer: AccountCustomer
  recentOrders: AccountOrderSummary[]
}> {
  const data = await customerAccountFetch<{
    customer: {
      id: string
      displayName: string
      firstName?: string | null
      lastName?: string | null
      emailAddress?: { emailAddress?: string | null } | null
      defaultAddress?: { id?: string | null } | null
      orders: {
        nodes: Array<{
          id: string
          name: string
          processedAt: string
          financialStatus?: string | null
          fulfillmentStatus: string
          statusPageUrl: string
          totalPrice: { amount: string; currencyCode: string }
        }>
      }
    }
  }>({ query: CUSTOMER_DASHBOARD_QUERY })

  return {
    customer: mapCustomer(data.customer),
    recentOrders: data.customer.orders.nodes.map(mapOrderSummary),
  }
}

export async function getCustomerProfile(): Promise<AccountCustomer> {
  const data = await customerAccountFetch<{
    customer: Parameters<typeof mapCustomer>[0]
  }>({ query: CUSTOMER_PROFILE_QUERY })
  return mapCustomer(data.customer)
}

export async function getCustomerOrders(options?: {
  first?: number
  after?: string | null
}): Promise<{
  orders: AccountOrderSummary[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}> {
  const data = await customerAccountFetch<{
    customer: {
      orders: {
        nodes: Array<Parameters<typeof mapOrderSummary>[0]>
        pageInfo: { hasNextPage: boolean; endCursor?: string | null }
      }
    }
  }>({
    query: CUSTOMER_ORDERS_QUERY,
    variables: {
      first: options?.first ?? 20,
      after: options?.after ?? null,
    },
  })

  return {
    orders: data.customer.orders.nodes.map(mapOrderSummary),
    pageInfo: {
      hasNextPage: data.customer.orders.pageInfo.hasNextPage,
      endCursor: data.customer.orders.pageInfo.endCursor ?? null,
    },
  }
}

export async function getCustomerOrderById(
  id: string
): Promise<AccountOrderDetail | null> {
  const data = await customerAccountFetch<{
    order: Parameters<typeof mapOrderDetail>[0] | null
  }>({
    query: CUSTOMER_ORDER_QUERY,
    variables: { id },
  })

  if (!data.order) return null
  return mapOrderDetail(data.order)
}

export async function getCustomerAddresses(): Promise<AccountAddress[]> {
  const data = await customerAccountFetch<{
    customer: {
      defaultAddress?: { id?: string | null } | null
      addresses: { nodes: Array<Parameters<typeof mapAddress>[0]> }
    }
  }>({ query: CUSTOMER_ADDRESSES_QUERY })

  const defaultId = data.customer.defaultAddress?.id ?? null
  return data.customer.addresses.nodes
    .map((node) => mapAddress(node, defaultId))
    .filter((address): address is AccountAddress => Boolean(address))
}

export async function updateCustomerProfile(input: {
  firstName?: string
  lastName?: string
}): Promise<AccountCustomer> {
  const data = await customerAccountFetch<{
    customerUpdate: {
      customer: Parameters<typeof mapCustomer>[0] | null
      userErrors: UserError[]
    }
  }>({
    query: CUSTOMER_UPDATE_MUTATION,
    variables: { input },
  })

  const error = firstUserError(data.customerUpdate.userErrors)
  if (error) throw new ShopifyClientError(error, 400)
  if (!data.customerUpdate.customer) {
    throw new ShopifyClientError("Profile update returned no customer.")
  }
  return mapCustomer(data.customerUpdate.customer)
}

export async function createCustomerAddress(input: {
  address: AccountAddressInput
  defaultAddress?: boolean
}): Promise<AccountAddress> {
  const data = await customerAccountFetch<{
    customerAddressCreate: {
      customerAddress: Parameters<typeof mapAddress>[0]
      userErrors: UserError[]
    }
  }>({
    query: CUSTOMER_ADDRESS_CREATE_MUTATION,
    variables: {
      address: input.address,
      defaultAddress: input.defaultAddress ?? false,
    },
  })

  const error = firstUserError(data.customerAddressCreate.userErrors)
  if (error) throw new ShopifyClientError(error, 400)
  const address = mapAddress(
    data.customerAddressCreate.customerAddress,
    input.defaultAddress ? data.customerAddressCreate.customerAddress?.id : null
  )
  if (!address) throw new ShopifyClientError("Address create returned no address.")
  return address
}

export async function updateCustomerAddress(input: {
  addressId: string
  address: AccountAddressInput
  defaultAddress?: boolean
}): Promise<AccountAddress> {
  const data = await customerAccountFetch<{
    customerAddressUpdate: {
      customerAddress: Parameters<typeof mapAddress>[0]
      userErrors: UserError[]
    }
  }>({
    query: CUSTOMER_ADDRESS_UPDATE_MUTATION,
    variables: {
      addressId: input.addressId,
      address: input.address,
      defaultAddress: input.defaultAddress,
    },
  })

  const error = firstUserError(data.customerAddressUpdate.userErrors)
  if (error) throw new ShopifyClientError(error, 400)
  const address = mapAddress(
    data.customerAddressUpdate.customerAddress,
    input.defaultAddress ? input.addressId : null
  )
  if (!address) throw new ShopifyClientError("Address update returned no address.")
  return address
}

export async function deleteCustomerAddress(addressId: string): Promise<void> {
  const data = await customerAccountFetch<{
    customerAddressDelete: {
      deletedAddressId: string | null
      userErrors: UserError[]
    }
  }>({
    query: CUSTOMER_ADDRESS_DELETE_MUTATION,
    variables: { addressId },
  })

  const error = firstUserError(data.customerAddressDelete.userErrors)
  if (error) throw new ShopifyClientError(error, 400)
}
