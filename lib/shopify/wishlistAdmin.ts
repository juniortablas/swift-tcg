/**
 * Admin API wishlist metafield fallback.
 *
 * Used when Customer Account API metafield access is unavailable
 * (definition not exposed to CA, or CA write rejected). Requires Admin
 * scopes `read_customers` + `write_customers`.
 */

import {
  parseWishlistProductIds,
  serializeWishlistProductIds,
  WISHLIST_KEY,
  WISHLIST_METAFIELD_TYPE,
  WISHLIST_NAMESPACE,
} from "@/lib/wishlist/constants"

import { ShopifyClientError } from "./client"
import { shopifyAdminFetch } from "./admin"

type UserError = { field?: string[] | null; message: string; code?: string | null }

export type AdminWishlistState = {
  customerId: string
  productIds: string[]
  compareDigest: string | null
}

function firstUserError(errors: UserError[] | undefined): string | null {
  return errors?.[0]?.message ?? null
}

export async function getAdminWishlistMetafield(
  customerId: string
): Promise<AdminWishlistState> {
  const data = await shopifyAdminFetch<{
    customer: {
      id: string
      wishlist?: { value?: string | null; compareDigest?: string | null } | null
    } | null
  }>({
    query: /* GraphQL */ `
      query AdminCustomerWishlist(
        $id: ID!
        $namespace: String!
        $key: String!
      ) {
        customer(id: $id) {
          id
          wishlist: metafield(namespace: $namespace, key: $key) {
            value
            compareDigest
          }
        }
      }
    `,
    variables: {
      id: customerId,
      namespace: WISHLIST_NAMESPACE,
      key: WISHLIST_KEY,
    },
  })

  if (!data.customer) {
    throw new ShopifyClientError("Customer not found for wishlist.", 404)
  }

  return {
    customerId: data.customer.id,
    productIds: parseWishlistProductIds(data.customer.wishlist?.value),
    compareDigest: data.customer.wishlist?.compareDigest ?? null,
  }
}

export async function setAdminWishlistMetafield(input: {
  customerId: string
  productIds: string[]
  compareDigest?: string | null
}): Promise<AdminWishlistState> {
  const data = await shopifyAdminFetch<{
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
    query: /* GraphQL */ `
      mutation AdminCustomerMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            namespace
            key
            value
            compareDigest
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
