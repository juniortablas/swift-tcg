/**
 * Customer Account API back-in-stock metafield read/write.
 *
 * Requires CUSTOMER metafield definition with Customer Account access
 * set to read_write (see `scripts/setup-back-in-stock-metafields.ts`).
 */

import {
  BIS_CUSTOMER_KEY,
  BIS_CUSTOMER_METAFIELD_TYPE,
  BIS_NAMESPACE,
  parseCustomerSubscriptions,
  serializeCustomerSubscriptions,
  type BisSubscription,
} from "@/lib/back-in-stock/constants"
import { ShopifyClientError } from "../client"
import { customerAccountFetch } from "./client"
import {
  CUSTOMER_BACK_IN_STOCK_QUERY,
  CUSTOMER_METAFIELDS_SET_MUTATION,
} from "./queries"

type UserError = { field?: string[] | null; message: string; code?: string | null }

export type CustomerBisState = {
  customerId: string
  subscriptions: BisSubscription[]
  compareDigest: string | null
}

function firstUserError(errors: UserError[] | undefined): string | null {
  return errors?.[0]?.message ?? null
}

export async function getCustomerBackInStockMetafield(): Promise<CustomerBisState> {
  const data = await customerAccountFetch<{
    customer: {
      id: string
      backInStock?: { value?: string | null; compareDigest?: string | null } | null
    }
  }>({
    query: CUSTOMER_BACK_IN_STOCK_QUERY,
    variables: {
      namespace: BIS_NAMESPACE,
      key: BIS_CUSTOMER_KEY,
    },
  })

  return {
    customerId: data.customer.id,
    subscriptions: parseCustomerSubscriptions(data.customer.backInStock?.value),
    compareDigest: data.customer.backInStock?.compareDigest ?? null,
  }
}

export async function setCustomerBackInStockMetafield(input: {
  customerId: string
  subscriptions: BisSubscription[]
  compareDigest?: string | null
}): Promise<CustomerBisState> {
  const data = await customerAccountFetch<{
    metafieldsSet: {
      metafields: Array<{
        namespace: string
        key: string
        value?: string | null
        compareDigest?: string | null
      }> | null
      userErrors: UserError[]
    }
  }>({
    query: CUSTOMER_METAFIELDS_SET_MUTATION,
    variables: {
      metafields: [
        {
          ownerId: input.customerId,
          namespace: BIS_NAMESPACE,
          key: BIS_CUSTOMER_KEY,
          type: BIS_CUSTOMER_METAFIELD_TYPE,
          value: serializeCustomerSubscriptions(input.subscriptions),
          ...(input.compareDigest !== undefined
            ? { compareDigest: input.compareDigest }
            : {}),
        },
      ],
    },
  })

  const error = firstUserError(data.metafieldsSet.userErrors)
  if (error) throw new ShopifyClientError(error, 400)

  const metafield = data.metafieldsSet.metafields?.[0]
  return {
    customerId: input.customerId,
    subscriptions: parseCustomerSubscriptions(metafield?.value),
    compareDigest: metafield?.compareDigest ?? null,
  }
}
