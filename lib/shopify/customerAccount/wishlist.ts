/**
 * Customer Account API wishlist metafield read/write.
 *
 * Requires a CUSTOMER metafield definition with Customer Account access
 * set to read_write (see `scripts/setup-wishlist-metafield.ts`).
 */

import { ShopifyClientError } from "../client"
import {
  parseWishlistProductIds,
  serializeWishlistProductIds,
  WISHLIST_KEY,
  WISHLIST_METAFIELD_TYPE,
  WISHLIST_NAMESPACE,
} from "@/lib/wishlist/constants"

import { customerAccountFetch } from "./client"
import {
  CUSTOMER_ID_QUERY,
  CUSTOMER_METAFIELDS_SET_MUTATION,
  CUSTOMER_WISHLIST_QUERY,
} from "./queries"

type UserError = { field?: string[] | null; message: string; code?: string | null }

export type CustomerWishlistState = {
  customerId: string
  productIds: string[]
  compareDigest: string | null
}

function firstUserError(errors: UserError[] | undefined): string | null {
  return errors?.[0]?.message ?? null
}

export async function getAuthenticatedCustomerId(): Promise<string> {
  const data = await customerAccountFetch<{
    customer: { id: string }
  }>({ query: CUSTOMER_ID_QUERY })
  return data.customer.id
}

export async function getCustomerWishlistMetafield(): Promise<CustomerWishlistState> {
  const data = await customerAccountFetch<{
    customer: {
      id: string
      wishlist?: { value?: string | null; compareDigest?: string | null } | null
    }
  }>({
    query: CUSTOMER_WISHLIST_QUERY,
    variables: {
      namespace: WISHLIST_NAMESPACE,
      key: WISHLIST_KEY,
    },
  })

  return {
    customerId: data.customer.id,
    productIds: parseWishlistProductIds(data.customer.wishlist?.value),
    compareDigest: data.customer.wishlist?.compareDigest ?? null,
  }
}

export async function setCustomerWishlistMetafield(input: {
  customerId: string
  productIds: string[]
  compareDigest?: string | null
}): Promise<CustomerWishlistState> {
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
          namespace: WISHLIST_NAMESPACE,
          key: WISHLIST_KEY,
          type: WISHLIST_METAFIELD_TYPE,
          value: serializeWishlistProductIds(input.productIds),
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
    productIds: parseWishlistProductIds(metafield?.value),
    compareDigest: metafield?.compareDigest ?? null,
  }
}
