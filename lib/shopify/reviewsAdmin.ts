/**
 * Admin GraphQL helpers for product reviews (metaobjects + aggregates).
 *
 * Reviews are never exposed via Storefront metaobjects (pending moderation).
 * Aggregate rating/count live on product metafields for card/PDP performance.
 */

import {
  REVIEW_BREAKDOWN_KEY,
  REVIEW_COUNT_KEY,
  REVIEW_FIELD,
  REVIEW_HELPFUL_VOTES_KEY,
  REVIEW_HELPFUL_VOTES_METAFIELD_TYPE,
  REVIEW_MAX_FETCH,
  REVIEW_METAOBJECT_TYPE,
  REVIEW_NAMESPACE,
  REVIEW_RATING_KEY,
  REVIEW_STATUS,
  clampRating,
  computeAverage,
  emptyBreakdown,
  isCustomerGid,
  isMetaobjectGid,
  isOrderGid,
  isProductGid,
  isReviewStatus,
  parseBreakdown,
  parseHelpfulVotes,
  serializeHelpfulVotes,
  type ReviewBreakdown,
  type ReviewStatus,
} from "@/lib/reviews/constants"
import type {
  ProductReview,
  ReviewImage,
  ReviewSort,
  ReviewSummary,
} from "@/lib/reviews/types"
import { shopifyAdminFetch } from "@/lib/shopify/admin"
import { ShopifyClientError } from "@/lib/shopify/client"

type UserError = { field?: string[] | null; message: string; code?: string | null }

type AdminMetaobjectField = {
  key: string
  value: string | null
  reference?: {
    __typename?: string
    id?: string
    image?: {
      url?: string | null
      altText?: string | null
      width?: number | null
      height?: number | null
    } | null
  } | null
  references?: {
    nodes?: Array<{
      __typename?: string
      id?: string
      image?: {
        url?: string | null
        altText?: string | null
        width?: number | null
        height?: number | null
      } | null
    } | null>
  } | null
}

type AdminMetaobjectNode = {
  id: string
  handle: string
  type: string
  updatedAt: string
  fields: AdminMetaobjectField[]
}

function fieldMap(node: AdminMetaobjectNode): Map<string, AdminMetaobjectField> {
  return new Map(node.fields.map((field) => [field.key, field]))
}

function fieldValue(
  fields: Map<string, AdminMetaobjectField>,
  key: string
): string | null {
  const value = fields.get(key)?.value?.trim()
  return value ? value : null
}

function mapImages(field: AdminMetaobjectField | undefined): ReviewImage[] {
  const nodes = field?.references?.nodes ?? []
  const images: ReviewImage[] = []
  for (const node of nodes) {
    if (!node?.id || !node.image?.url) continue
    images.push({
      id: node.id,
      url: node.image.url,
      altText: node.image.altText ?? null,
      width: node.image.width ?? null,
      height: node.image.height ?? null,
    })
  }
  return images
}

function displayNameFromReview(input: {
  nickname: string | null
  customerId: string
}): string {
  if (input.nickname?.trim()) return input.nickname.trim()
  const numeric = input.customerId.replace(/\D/g, "").slice(-4)
  return numeric ? `Collector ${numeric}` : "Collector"
}

export function mapAdminReview(node: AdminMetaobjectNode): ProductReview | null {
  const fields = fieldMap(node)
  const productId = fieldValue(fields, REVIEW_FIELD.productId)
  const customerId = fieldValue(fields, REVIEW_FIELD.customerId)
  const rating = clampRating(fieldValue(fields, REVIEW_FIELD.rating))
  const body = fieldValue(fields, REVIEW_FIELD.body)
  const statusRaw = fieldValue(fields, REVIEW_FIELD.status)
  if (
    !productId ||
    !isProductGid(productId) ||
    !customerId ||
    !isCustomerGid(customerId) ||
    rating == null ||
    !body ||
    !isReviewStatus(statusRaw)
  ) {
    return null
  }

  const nickname = fieldValue(fields, REVIEW_FIELD.nickname)
  const reviewedAt =
    fieldValue(fields, REVIEW_FIELD.reviewedAt) || node.updatedAt
  const orderRaw = fieldValue(fields, REVIEW_FIELD.order)
  const orderId = orderRaw && isOrderGid(orderRaw) ? orderRaw : null
  const verified =
    fieldValue(fields, REVIEW_FIELD.verifiedPurchase)?.toLowerCase() === "true"
  const helpfulRaw = fieldValue(fields, REVIEW_FIELD.helpfulCount)
  const helpfulCount = Math.max(0, Number.parseInt(helpfulRaw ?? "0", 10) || 0)

  return {
    id: node.id,
    productId,
    customerId,
    orderId,
    rating,
    title: fieldValue(fields, REVIEW_FIELD.title),
    body,
    images: mapImages(fields.get(REVIEW_FIELD.images)),
    verifiedPurchase: verified,
    helpfulCount,
    status: statusRaw,
    nickname,
    displayName: displayNameFromReview({ nickname, customerId }),
    reviewedAt,
    createdAt: reviewedAt,
    updatedAt: node.updatedAt,
  }
}

const METAOBJECT_FIELDS = `
  id
  handle
  type
  updatedAt
  fields {
    key
    value
    reference {
      __typename
      ... on MediaImage {
        id
        image {
          url
          altText
          width
          height
        }
      }
      ... on Product {
        id
      }
      ... on Customer {
        id
      }
      ... on Order {
        id
      }
    }
    references(first: 10) {
      nodes {
        __typename
        ... on MediaImage {
          id
          image {
            url
            altText
            width
            height
          }
        }
      }
    }
  }
`

export async function getAdminReviewById(
  id: string
): Promise<ProductReview | null> {
  if (!isMetaobjectGid(id)) return null
  const data = await shopifyAdminFetch<{
    metaobject: AdminMetaobjectNode | null
  }>({
    query: /* GraphQL */ `
      query ReviewById($id: ID!) {
        metaobject(id: $id) {
          ${METAOBJECT_FIELDS}
        }
      }
    `,
    variables: { id },
  })
  if (!data.metaobject || data.metaobject.type !== REVIEW_METAOBJECT_TYPE) {
    return null
  }
  return mapAdminReview(data.metaobject)
}

async function queryReviews(input: {
  query: string
  first?: number
  after?: string | null
}): Promise<{
  reviews: ProductReview[]
  pageInfo: { hasNextPage: boolean; endCursor: string | null }
}> {
  const data = await shopifyAdminFetch<{
    metaobjects: {
      nodes: AdminMetaobjectNode[]
      pageInfo: { hasNextPage: boolean; endCursor?: string | null }
    }
  }>({
    query: /* GraphQL */ `
      query ReviewsQuery($type: String!, $first: Int!, $after: String, $query: String!) {
        metaobjects(
          type: $type
          first: $first
          after: $after
          query: $query
        ) {
          nodes {
            ${METAOBJECT_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    variables: {
      type: REVIEW_METAOBJECT_TYPE,
      first: input.first ?? REVIEW_MAX_FETCH,
      after: input.after ?? null,
      query: input.query,
    },
  })

  const reviews = data.metaobjects.nodes
    .map(mapAdminReview)
    .filter((review): review is ProductReview => Boolean(review))

  return {
    reviews,
    pageInfo: {
      hasNextPage: data.metaobjects.pageInfo.hasNextPage,
      endCursor: data.metaobjects.pageInfo.endCursor ?? null,
    },
  }
}

export async function listApprovedReviewsForProduct(
  productId: string
): Promise<ProductReview[]> {
  if (!isProductGid(productId)) return []
  const escaped = productId.replace(/"/g, '\\"')
  const { reviews } = await queryReviews({
    query: `fields.${REVIEW_FIELD.productId}:"${escaped}" AND fields.${REVIEW_FIELD.status}:${REVIEW_STATUS.approved}`,
    first: REVIEW_MAX_FETCH,
  })
  return reviews.filter((review) => review.productId === productId)
}

export async function listCustomerReviews(
  customerId: string
): Promise<ProductReview[]> {
  if (!isCustomerGid(customerId)) return []
  const escaped = customerId.replace(/"/g, '\\"')
  const { reviews } = await queryReviews({
    query: `fields.${REVIEW_FIELD.customerId}:"${escaped}"`,
    first: REVIEW_MAX_FETCH,
  })
  return reviews
    .filter((review) => review.customerId === customerId)
    .sort(
      (a, b) =>
        new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
    )
}

export async function findCustomerProductReview(input: {
  customerId: string
  productId: string
}): Promise<ProductReview | null> {
  const reviews = await listCustomerReviews(input.customerId)
  return (
    reviews.find(
      (review) =>
        review.productId === input.productId &&
        review.status !== REVIEW_STATUS.rejected
    ) ?? null
  )
}

export function sortReviews(
  reviews: ProductReview[],
  sort: ReviewSort
): ProductReview[] {
  const copy = [...reviews]
  if (sort === "highest") {
    copy.sort((a, b) => b.rating - a.rating || b.reviewedAt.localeCompare(a.reviewedAt))
  } else if (sort === "lowest") {
    copy.sort((a, b) => a.rating - b.rating || b.reviewedAt.localeCompare(a.reviewedAt))
  } else {
    copy.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
  }
  return copy
}

export function summaryFromReviews(reviews: ProductReview[]): ReviewSummary {
  const breakdown = emptyBreakdown()
  for (const review of reviews) {
    if (review.status !== REVIEW_STATUS.approved) continue
    const key = String(review.rating) as keyof ReviewBreakdown
    if (key in breakdown) breakdown[key] += 1
  }
  const { average, count } = computeAverage(breakdown)
  return { average, count, breakdown }
}

export async function findCustomerPurchase(input: {
  customerId: string
  productId: string
}): Promise<{ orderId: string; verified: boolean } | null> {
  if (!isCustomerGid(input.customerId) || !isProductGid(input.productId)) {
    return null
  }

  const data = await shopifyAdminFetch<{
    customer: {
      orders: {
        nodes: Array<{
          id: string
          displayFinancialStatus?: string | null
          lineItems: {
            nodes: Array<{
              product?: { id?: string | null } | null
            }>
          }
        }>
      }
    } | null
  }>({
    query: /* GraphQL */ `
      query CustomerPurchaseCheck($id: ID!) {
        customer(id: $id) {
          orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
            nodes {
              id
              displayFinancialStatus
              lineItems(first: 50) {
                nodes {
                  product {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `,
    variables: { id: input.customerId },
  })

  const orders = data.customer?.orders.nodes ?? []
  for (const order of orders) {
    const status = order.displayFinancialStatus?.toUpperCase() ?? ""
    if (status === "REFUNDED" || status === "VOIDED") continue
    const hit = order.lineItems.nodes.some(
      (line) => line.product?.id === input.productId
    )
    if (hit) {
      return { orderId: order.id, verified: true }
    }
  }
  return null
}

function assertNoUserErrors(label: string, errors: UserError[] | undefined) {
  if (!errors?.length) return
  throw new ShopifyClientError(
    `${label}: ${errors.map((e) => e.message).join("; ")}`,
    400
  )
}

export async function createReviewMetaobject(input: {
  productId: string
  customerId: string
  orderId: string | null
  rating: number
  title: string | null
  body: string
  imageIds: string[]
  verifiedPurchase: boolean
  nickname: string | null
  status?: ReviewStatus
}): Promise<ProductReview> {
  const reviewedAt = new Date().toISOString()
  const fields: Array<{ key: string; value: string }> = [
    { key: REVIEW_FIELD.product, value: input.productId },
    { key: REVIEW_FIELD.productId, value: input.productId },
    { key: REVIEW_FIELD.customer, value: input.customerId },
    { key: REVIEW_FIELD.customerId, value: input.customerId },
    { key: REVIEW_FIELD.rating, value: String(input.rating) },
    { key: REVIEW_FIELD.body, value: input.body },
    {
      key: REVIEW_FIELD.verifiedPurchase,
      value: input.verifiedPurchase ? "true" : "false",
    },
    { key: REVIEW_FIELD.helpfulCount, value: "0" },
    {
      key: REVIEW_FIELD.status,
      value: input.status ?? REVIEW_STATUS.pending,
    },
    { key: REVIEW_FIELD.reviewedAt, value: reviewedAt },
  ]

  if (input.orderId) {
    fields.push({ key: REVIEW_FIELD.order, value: input.orderId })
  }
  if (input.title) {
    fields.push({ key: REVIEW_FIELD.title, value: input.title })
  }
  if (input.nickname) {
    fields.push({ key: REVIEW_FIELD.nickname, value: input.nickname })
  }
  if (input.imageIds.length > 0) {
    fields.push({
      key: REVIEW_FIELD.images,
      value: JSON.stringify(input.imageIds),
    })
  }

  const data = await shopifyAdminFetch<{
    metaobjectCreate: {
      metaobject: AdminMetaobjectNode | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation CreateReview($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            ${METAOBJECT_FIELDS}
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
      metaobject: {
        type: REVIEW_METAOBJECT_TYPE,
        fields,
      },
    },
  })

  assertNoUserErrors("metaobjectCreate", data.metaobjectCreate.userErrors)
  const mapped = data.metaobjectCreate.metaobject
    ? mapAdminReview(data.metaobjectCreate.metaobject)
    : null
  if (!mapped) {
    throw new ShopifyClientError("Review create returned no metaobject.", 502)
  }
  return mapped
}

export async function updateReviewMetaobject(input: {
  id: string
  fields: Array<{ key: string; value: string }>
}): Promise<ProductReview> {
  const data = await shopifyAdminFetch<{
    metaobjectUpdate: {
      metaobject: AdminMetaobjectNode | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation UpdateReview($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            ${METAOBJECT_FIELDS}
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
      id: input.id,
      metaobject: { fields: input.fields },
    },
  })

  assertNoUserErrors("metaobjectUpdate", data.metaobjectUpdate.userErrors)
  const mapped = data.metaobjectUpdate.metaobject
    ? mapAdminReview(data.metaobjectUpdate.metaobject)
    : null
  if (!mapped) {
    throw new ShopifyClientError("Review update returned no metaobject.", 502)
  }
  return mapped
}

export async function deleteReviewMetaobject(id: string): Promise<void> {
  const data = await shopifyAdminFetch<{
    metaobjectDelete: {
      deletedId: string | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation DeleteReview($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: { id },
  })
  assertNoUserErrors("metaobjectDelete", data.metaobjectDelete.userErrors)
}

export async function setReviewHelpfulCount(input: {
  id: string
  helpfulCount: number
}): Promise<ProductReview> {
  return updateReviewMetaobject({
    id: input.id,
    fields: [
      {
        key: REVIEW_FIELD.helpfulCount,
        value: String(Math.max(0, Math.floor(input.helpfulCount))),
      },
    ],
  })
}

export async function getCustomerHelpfulVotes(customerId: string): Promise<{
  reviewIds: string[]
  compareDigest: string | null
}> {
  const data = await shopifyAdminFetch<{
    customer: {
      metafield: {
        value?: string | null
        compareDigest?: string | null
      } | null
    } | null
  }>({
    query: /* GraphQL */ `
      query CustomerHelpfulVotes($id: ID!, $namespace: String!, $key: String!) {
        customer(id: $id) {
          metafield(namespace: $namespace, key: $key) {
            value
            compareDigest
          }
        }
      }
    `,
    variables: {
      id: customerId,
      namespace: REVIEW_NAMESPACE,
      key: REVIEW_HELPFUL_VOTES_KEY,
    },
  })

  return {
    reviewIds: parseHelpfulVotes(data.customer?.metafield?.value),
    compareDigest: data.customer?.metafield?.compareDigest ?? null,
  }
}

export async function setCustomerHelpfulVotes(input: {
  customerId: string
  reviewIds: string[]
  compareDigest?: string | null
}): Promise<string[]> {
  const value = serializeHelpfulVotes(input.reviewIds)
  const data = await shopifyAdminFetch<{
    metafieldsSet: {
      metafields: Array<{ value?: string | null }> | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation SetHelpfulVotes($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            value
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
          namespace: REVIEW_NAMESPACE,
          key: REVIEW_HELPFUL_VOTES_KEY,
          type: REVIEW_HELPFUL_VOTES_METAFIELD_TYPE,
          value,
          ...(input.compareDigest
            ? { compareDigest: input.compareDigest }
            : {}),
        },
      ],
    },
  })

  assertNoUserErrors("metafieldsSet(helpful_votes)", data.metafieldsSet.userErrors)
  return parseHelpfulVotes(data.metafieldsSet.metafields?.[0]?.value)
}

export async function setProductReviewAggregates(input: {
  productId: string
  summary: ReviewSummary
}): Promise<void> {
  const data = await shopifyAdminFetch<{
    metafieldsSet: { userErrors: UserError[] }
  }>({
    query: /* GraphQL */ `
      mutation SetReviewAggregates($metafields: [MetafieldsSetInput!]!) {
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
      metafields: [
        {
          ownerId: input.productId,
          namespace: REVIEW_NAMESPACE,
          key: REVIEW_RATING_KEY,
          type: "number_decimal",
          value: input.summary.average.toFixed(1),
        },
        {
          ownerId: input.productId,
          namespace: REVIEW_NAMESPACE,
          key: REVIEW_COUNT_KEY,
          type: "number_integer",
          value: String(input.summary.count),
        },
        {
          ownerId: input.productId,
          namespace: REVIEW_NAMESPACE,
          key: REVIEW_BREAKDOWN_KEY,
          type: "json",
          value: JSON.stringify(input.summary.breakdown),
        },
      ],
    },
  })

  assertNoUserErrors(
    "metafieldsSet(review_aggregates)",
    data.metafieldsSet.userErrors
  )
}

/**
 * Recompute approved-review aggregates for a product and write metafields.
 * Called after submit/approve/reject/delete and from webhooks/cron.
 */
export async function syncProductReviewAggregates(
  productId: string
): Promise<ReviewSummary> {
  const approved = await listApprovedReviewsForProduct(productId)
  const summary = summaryFromReviews(approved)
  await setProductReviewAggregates({ productId, summary })
  return summary
}

export async function getProductReviewSummaryFromMetafields(
  productId: string
): Promise<ReviewSummary> {
  if (!isProductGid(productId)) {
    return { average: 0, count: 0, breakdown: emptyBreakdown() }
  }

  const data = await shopifyAdminFetch<{
    product: {
      rating: { value?: string | null } | null
      count: { value?: string | null } | null
      breakdown: { value?: string | null } | null
    } | null
  }>({
    query: /* GraphQL */ `
      query ProductReviewSummary(
        $id: ID!
        $namespace: String!
        $ratingKey: String!
        $countKey: String!
        $breakdownKey: String!
      ) {
        product(id: $id) {
          rating: metafield(namespace: $namespace, key: $ratingKey) {
            value
          }
          count: metafield(namespace: $namespace, key: $countKey) {
            value
          }
          breakdown: metafield(namespace: $namespace, key: $breakdownKey) {
            value
          }
        }
      }
    `,
    variables: {
      id: productId,
      namespace: REVIEW_NAMESPACE,
      ratingKey: REVIEW_RATING_KEY,
      countKey: REVIEW_COUNT_KEY,
      breakdownKey: REVIEW_BREAKDOWN_KEY,
    },
  })

  const breakdown = parseBreakdown(data.product?.breakdown?.value)
  const count = Number.parseInt(data.product?.count?.value ?? "0", 10) || 0
  const average = Number.parseFloat(data.product?.rating?.value ?? "0") || 0
  if (count === 0) {
    return { average: 0, count: 0, breakdown: emptyBreakdown() }
  }
  return {
    average: Math.round(average * 10) / 10,
    count,
    breakdown,
  }
}

/**
 * Staged upload → fileCreate for review photos. Returns MediaImage GID.
 */
export async function uploadReviewImage(input: {
  filename: string
  mimeType: string
  buffer: Buffer
  alt?: string
}): Promise<string> {
  const fileSize = String(input.buffer.byteLength)

  const staged = await shopifyAdminFetch<{
    stagedUploadsCreate: {
      stagedTargets: Array<{
        url: string
        resourceUrl: string
        parameters: Array<{ name: string; value: string }>
      }>
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      input: [
        {
          filename: input.filename,
          mimeType: input.mimeType,
          httpMethod: "POST",
          resource: "FILE",
          fileSize,
        },
      ],
    },
  })

  assertNoUserErrors(
    "stagedUploadsCreate",
    staged.stagedUploadsCreate.userErrors
  )
  const target = staged.stagedUploadsCreate.stagedTargets[0]
  if (!target) {
    throw new ShopifyClientError("stagedUploadsCreate returned no target.", 502)
  }

  const form = new FormData()
  for (const param of target.parameters) {
    form.append(param.name, param.value)
  }
  form.append(
    "file",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    input.filename
  )

  const uploadResponse = await fetch(target.url, {
    method: "POST",
    body: form,
  })
  if (!uploadResponse.ok && uploadResponse.status !== 201) {
    throw new ShopifyClientError(
      `Staged upload failed (${uploadResponse.status}).`,
      502
    )
  }

  const created = await shopifyAdminFetch<{
    fileCreate: {
      files: Array<{ id: string; fileStatus: string }>
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation FileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            id
            fileStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      files: [
        {
          alt: input.alt ?? "Customer review photo",
          contentType: "IMAGE",
          originalSource: target.resourceUrl,
        },
      ],
    },
  })

  assertNoUserErrors("fileCreate", created.fileCreate.userErrors)
  const file = created.fileCreate.files[0]
  if (!file?.id) {
    throw new ShopifyClientError("fileCreate returned no file id.", 502)
  }

  // Wait briefly for READY — images can still be referenced while processing.
  for (let i = 0; i < 8; i++) {
    const status = await shopifyAdminFetch<{
      node: { fileStatus?: string } | null
    }>({
      query: /* GraphQL */ `
        query FileStatus($id: ID!) {
          node(id: $id) {
            ... on File {
              fileStatus
            }
          }
        }
      `,
      variables: { id: file.id },
    })
    const fileStatus = status.node?.fileStatus
    if (fileStatus === "READY" || fileStatus === "FAILED") break
    await new Promise((resolve) => setTimeout(resolve, 400))
  }

  return file.id
}
