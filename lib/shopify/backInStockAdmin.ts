/**
 * Admin API back-in-stock metafields.
 *
 * - Customer JSON (fallback when CA access unavailable)
 * - Product reverse index of subscribers (cron fan-out)
 * - Shop watched-product list (cron scope)
 *
 * Requires Admin scopes: read_customers, write_customers, read_products,
 * write_products (and shop metafield write via write_products / metafields).
 */

import {
  BIS_CUSTOMER_KEY,
  BIS_CUSTOMER_METAFIELD_TYPE,
  BIS_NAMESPACE,
  BIS_PRODUCT_KEY,
  BIS_PRODUCT_METAFIELD_TYPE,
  BIS_SHOP_KEY,
  BIS_SHOP_METAFIELD_TYPE,
  parseCustomerSubscriptions,
  parseProductSubscribers,
  parseWatchedProductIds,
  serializeCustomerSubscriptions,
  serializeProductSubscribers,
  serializeWatchedProductIds,
  type BisProductSubscriber,
  type BisSubscription,
} from "@/lib/back-in-stock/constants"

import { ShopifyClientError } from "./client"
import { shopifyAdminFetch } from "./admin"

type UserError = { field?: string[] | null; message: string; code?: string | null }

function firstUserError(errors: UserError[] | undefined): string | null {
  return errors?.[0]?.message ?? null
}

export type AdminBisCustomerState = {
  customerId: string
  subscriptions: BisSubscription[]
  compareDigest: string | null
}

export type AdminBisProductState = {
  productId: string
  subscribers: BisProductSubscriber[]
  compareDigest: string | null
  availableForSale: boolean
  title: string | null
  handle: string | null
  imageUrl: string | null
  priceAmount: string | null
  priceCurrency: string | null
}

export type AdminBisShopState = {
  shopId: string
  productIds: string[]
  compareDigest: string | null
}

export type AdminCustomerEmail = {
  customerId: string
  email: string | null
  displayName: string | null
}

async function metafieldsSet(input: {
  ownerId: string
  namespace: string
  key: string
  type: string
  value: string
  compareDigest?: string | null
}): Promise<{ value: string | null; compareDigest: string | null }> {
  const data = await shopifyAdminFetch<{
    metafieldsSet: {
      metafields: Array<{
        value?: string | null
        compareDigest?: string | null
      }> | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation AdminBisMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
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
          ownerId: input.ownerId,
          namespace: input.namespace,
          key: input.key,
          type: input.type,
          value: input.value,
          ...(input.compareDigest !== undefined
            ? { compareDigest: input.compareDigest }
            : {}),
        },
      ],
    },
  })

  const error = firstUserError(data.metafieldsSet.userErrors)
  if (error) {
    const conflict = /compareDigest|stale|modified|conflict/i.test(error)
    throw new ShopifyClientError(error, conflict ? 409 : 400)
  }

  const metafield = data.metafieldsSet.metafields?.[0]
  return {
    value: metafield?.value ?? null,
    compareDigest: metafield?.compareDigest ?? null,
  }
}

export async function getAdminBackInStockMetafield(
  customerId: string
): Promise<AdminBisCustomerState> {
  const data = await shopifyAdminFetch<{
    customer: {
      id: string
      backInStock?: { value?: string | null; compareDigest?: string | null } | null
    } | null
  }>({
    query: /* GraphQL */ `
      query AdminCustomerBackInStock(
        $id: ID!
        $namespace: String!
        $key: String!
      ) {
        customer(id: $id) {
          id
          backInStock: metafield(namespace: $namespace, key: $key) {
            value
            compareDigest
          }
        }
      }
    `,
    variables: {
      id: customerId,
      namespace: BIS_NAMESPACE,
      key: BIS_CUSTOMER_KEY,
    },
  })

  if (!data.customer) {
    throw new ShopifyClientError("Customer not found for back-in-stock.", 404)
  }

  return {
    customerId: data.customer.id,
    subscriptions: parseCustomerSubscriptions(data.customer.backInStock?.value),
    compareDigest: data.customer.backInStock?.compareDigest ?? null,
  }
}

export async function setAdminBackInStockMetafield(input: {
  customerId: string
  subscriptions: BisSubscription[]
  compareDigest?: string | null
}): Promise<AdminBisCustomerState> {
  const result = await metafieldsSet({
    ownerId: input.customerId,
    namespace: BIS_NAMESPACE,
    key: BIS_CUSTOMER_KEY,
    type: BIS_CUSTOMER_METAFIELD_TYPE,
    value: serializeCustomerSubscriptions(input.subscriptions),
    compareDigest: input.compareDigest,
  })

  return {
    customerId: input.customerId,
    subscriptions: parseCustomerSubscriptions(result.value),
    compareDigest: result.compareDigest,
  }
}

export async function getAdminProductBisState(
  productId: string
): Promise<AdminBisProductState> {
  const data = await shopifyAdminFetch<{
    product: {
      id: string
      title: string
      handle: string
      featuredMedia?: {
        preview?: { image?: { url?: string | null } | null } | null
      } | null
      variants?: {
        nodes: Array<{
          availableForSale?: boolean | null
          price?: string | null
        }>
      } | null
      bisSubscribers?: { value?: string | null; compareDigest?: string | null } | null
    } | null
  }>({
    query: /* GraphQL */ `
      query AdminProductBackInStock(
        $id: ID!
        $namespace: String!
        $key: String!
      ) {
        product(id: $id) {
          id
          title
          handle
          featuredMedia {
            preview {
              image {
                url
              }
            }
          }
          variants(first: 5) {
            nodes {
              availableForSale
              price
            }
          }
          bisSubscribers: metafield(namespace: $namespace, key: $key) {
            value
            compareDigest
          }
        }
      }
    `,
    variables: {
      id: productId,
      namespace: BIS_NAMESPACE,
      key: BIS_PRODUCT_KEY,
    },
  })

  if (!data.product) {
    throw new ShopifyClientError("Product not found for back-in-stock.", 404)
  }

  const variants = data.product.variants?.nodes ?? []
  const availableForSale = variants.some((variant) => variant.availableForSale)
  const priceAmount =
    variants.find((variant) => variant.price)?.price ?? null

  return {
    productId: data.product.id,
    subscribers: parseProductSubscribers(data.product.bisSubscribers?.value),
    compareDigest: data.product.bisSubscribers?.compareDigest ?? null,
    availableForSale,
    title: data.product.title,
    handle: data.product.handle,
    imageUrl: data.product.featuredMedia?.preview?.image?.url ?? null,
    priceAmount,
    priceCurrency: "USD",
  }
}

export async function setAdminProductSubscribers(input: {
  productId: string
  subscribers: BisProductSubscriber[]
  compareDigest?: string | null
}): Promise<{
  productId: string
  subscribers: BisProductSubscriber[]
  compareDigest: string | null
}> {
  const result = await metafieldsSet({
    ownerId: input.productId,
    namespace: BIS_NAMESPACE,
    key: BIS_PRODUCT_KEY,
    type: BIS_PRODUCT_METAFIELD_TYPE,
    value: serializeProductSubscribers(input.subscribers),
    compareDigest: input.compareDigest,
  })

  return {
    productId: input.productId,
    subscribers: parseProductSubscribers(result.value),
    compareDigest: result.compareDigest,
  }
}

/**
 * Claim all current subscribers for a product by clearing the reverse index
 * with optimistic concurrency. Returns claimed subscribers, or null on conflict.
 */
export async function claimProductSubscribers(
  productId: string
): Promise<BisProductSubscriber[] | null> {
  const current = await getAdminProductBisState(productId)
  if (current.subscribers.length === 0) return []

  try {
    await metafieldsSet({
      ownerId: productId,
      namespace: BIS_NAMESPACE,
      key: BIS_PRODUCT_KEY,
      type: BIS_PRODUCT_METAFIELD_TYPE,
      value: serializeProductSubscribers([]),
      compareDigest: current.compareDigest,
    })
    return current.subscribers
  } catch (error) {
    if (error instanceof ShopifyClientError && error.status === 409) {
      return null
    }
    throw error
  }
}

export async function getShopId(): Promise<string> {
  const data = await shopifyAdminFetch<{ shop: { id: string } }>({
    query: /* GraphQL */ `
      query AdminShopId {
        shop {
          id
        }
      }
    `,
  })
  return data.shop.id
}

export async function getWatchedProductIds(): Promise<AdminBisShopState> {
  const data = await shopifyAdminFetch<{
    shop: {
      id: string
      watched?: { value?: string | null; compareDigest?: string | null } | null
    }
  }>({
    query: /* GraphQL */ `
      query AdminBisWatchedProducts($namespace: String!, $key: String!) {
        shop {
          id
          watched: metafield(namespace: $namespace, key: $key) {
            value
            compareDigest
          }
        }
      }
    `,
    variables: {
      namespace: BIS_NAMESPACE,
      key: BIS_SHOP_KEY,
    },
  })

  return {
    shopId: data.shop.id,
    productIds: parseWatchedProductIds(data.shop.watched?.value),
    compareDigest: data.shop.watched?.compareDigest ?? null,
  }
}

export async function setWatchedProductIds(input: {
  shopId: string
  productIds: string[]
  compareDigest?: string | null
}): Promise<AdminBisShopState> {
  const result = await metafieldsSet({
    ownerId: input.shopId,
    namespace: BIS_NAMESPACE,
    key: BIS_SHOP_KEY,
    type: BIS_SHOP_METAFIELD_TYPE,
    value: serializeWatchedProductIds(input.productIds),
    compareDigest: input.compareDigest,
  })

  return {
    shopId: input.shopId,
    productIds: parseWatchedProductIds(result.value),
    compareDigest: result.compareDigest,
  }
}

export async function addProductToWatchedList(productId: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const watched = await getWatchedProductIds()
    if (watched.productIds.includes(productId)) return
    try {
      await setWatchedProductIds({
        shopId: watched.shopId,
        productIds: [productId, ...watched.productIds],
        compareDigest: watched.compareDigest,
      })
      return
    } catch (error) {
      if (
        error instanceof ShopifyClientError &&
        error.status === 409 &&
        attempt < 2
      ) {
        continue
      }
      throw error
    }
  }
}

export async function removeProductFromWatchedList(
  productId: string
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const watched = await getWatchedProductIds()
    if (!watched.productIds.includes(productId)) return
    try {
      await setWatchedProductIds({
        shopId: watched.shopId,
        productIds: watched.productIds.filter((id) => id !== productId),
        compareDigest: watched.compareDigest,
      })
      return
    } catch (error) {
      if (
        error instanceof ShopifyClientError &&
        error.status === 409 &&
        attempt < 2
      ) {
        continue
      }
      throw error
    }
  }
}

export async function getAdminCustomerEmails(
  customerIds: string[]
): Promise<AdminCustomerEmail[]> {
  const unique = [...new Set(customerIds.filter(Boolean))]
  if (unique.length === 0) return []

  const CHUNK = 50
  const results: AdminCustomerEmail[] = []

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK)
    const data = await shopifyAdminFetch<{
      nodes: Array<{
        id: string
        displayName?: string | null
        defaultEmailAddress?: { emailAddress?: string | null } | null
      } | null>
    }>({
      query: /* GraphQL */ `
        query AdminCustomerEmails($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Customer {
              id
              displayName
              defaultEmailAddress {
                emailAddress
              }
            }
          }
        }
      `,
      variables: { ids: chunk },
    })

    for (const node of data.nodes) {
      if (!node?.id) continue
      results.push({
        customerId: node.id,
        displayName: node.displayName ?? null,
        email: node.defaultEmailAddress?.emailAddress?.trim() || null,
      })
    }
  }

  return results
}

export async function getAdminProductsAvailability(
  productIds: string[]
): Promise<
  Array<{
    productId: string
    availableForSale: boolean
    title: string | null
    handle: string | null
    imageUrl: string | null
    priceAmount: string | null
    priceCurrency: string | null
  }>
> {
  const unique = [...new Set(productIds.filter(Boolean))]
  if (unique.length === 0) return []

  const CHUNK = 50
  const results: Array<{
    productId: string
    availableForSale: boolean
    title: string | null
    handle: string | null
    imageUrl: string | null
    priceAmount: string | null
    priceCurrency: string | null
  }> = []

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK)
    const data = await shopifyAdminFetch<{
      nodes: Array<{
        id: string
        title: string
        handle: string
        featuredMedia?: {
          preview?: { image?: { url?: string | null } | null } | null
        } | null
        variants?: {
          nodes: Array<{
            availableForSale?: boolean | null
            price?: string | null
          }>
        } | null
      } | null>
    }>({
      query: /* GraphQL */ `
        query AdminProductsAvailability($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              title
              handle
              featuredMedia {
                preview {
                  image {
                    url
                  }
                }
              }
              variants(first: 5) {
                nodes {
                  availableForSale
                  price
                }
              }
            }
          }
        }
      `,
      variables: { ids: chunk },
    })

    for (const node of data.nodes) {
      if (!node?.id) continue
      const variants = node.variants?.nodes ?? []
      results.push({
        productId: node.id,
        availableForSale: variants.some((variant) => variant.availableForSale),
        title: node.title,
        handle: node.handle,
        imageUrl: node.featuredMedia?.preview?.image?.url ?? null,
        priceAmount: variants.find((variant) => variant.price)?.price ?? null,
        priceCurrency: "USD",
      })
    }
  }

  return results
}

/**
 * Keep customer + product indexes in sync after a subscribe/unsubscribe.
 */
export async function syncProductSubscriberIndex(input: {
  customerId: string
  productId: string
  action: "add" | "remove"
  subscribedAt?: string
}): Promise<void> {
  const state = await getAdminProductBisState(input.productId)
  const exists = state.subscribers.some((s) => s.customerId === input.customerId)

  let next = state.subscribers
  if (input.action === "add") {
    if (exists) return
    next = [
      {
        customerId: input.customerId,
        subscribedAt: input.subscribedAt ?? new Date().toISOString(),
      },
      ...state.subscribers,
    ]
  } else {
    if (!exists) {
      if (state.subscribers.length === 0) {
        await removeProductFromWatchedList(input.productId).catch(() => undefined)
      }
      return
    }
    next = state.subscribers.filter((s) => s.customerId !== input.customerId)
  }

  await setAdminProductSubscribers({
    productId: input.productId,
    subscribers: next,
    compareDigest: state.compareDigest,
  })

  if (next.length === 0) {
    await removeProductFromWatchedList(input.productId)
  } else {
    await addProductToWatchedList(input.productId)
  }
}
