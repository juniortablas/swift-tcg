/**
 * Storefront API GraphQL query documents.
 *
 * Keep documents here; execute them through `shopifyFetch` in `client.ts`.
 */

const PRODUCT_FIELDS = `
  id
  handle
  title
  productType
  vendor
  tags
  availableForSale
  createdAt
  releaseDate: metafield(namespace: "custom", key: "release_date") {
    value
  }
  language: metafield(namespace: "custom", key: "language") {
    value
  }
  reviewRating: metafield(namespace: "swift", key: "review_rating") {
    value
  }
  reviewCount: metafield(namespace: "swift", key: "review_count") {
    value
  }
  reviewBreakdown: metafield(namespace: "swift", key: "review_breakdown") {
    value
  }
  homepagePosition: metafield(namespace: "swift", key: "homepage_position") {
    value
  }
  seo {
    title
    description
  }
  featuredImage {
    url
    altText
    width
    height
  }
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
  }
  variants(first: 100) {
    edges {
      node {
        id
        title
        availableForSale
        price {
          amount
          currencyCode
        }
        image {
          url
          altText
          width
          height
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
`

const COLLECTION_FIELDS = `
  id
  handle
  title
  description
  descriptionHtml
  updatedAt
  seo {
    title
    description
  }
  image {
    url
    altText
    width
    height
  }
`

/** Paginated product list. */
export const GET_PRODUCTS = `
  query GetProducts(
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $query: String
  ) {
    products(
      first: $first
      after: $after
      sortKey: $sortKey
      reverse: $reverse
      query: $query
    ) {
      edges {
        cursor
        node {
          ${PRODUCT_FIELDS}
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

/** Single product by handle (slug). Includes body HTML + PDP metafields. */
export const GET_PRODUCT_BY_HANDLE = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      ${PRODUCT_FIELDS}
      description
      descriptionHtml
      series: metafield(namespace: "custom", key: "series") {
        value
      }
      condition: metafield(namespace: "custom", key: "condition") {
        value
      }
      rarity: metafield(namespace: "custom", key: "rarity") {
        value
      }
      productCode: metafield(namespace: "custom", key: "product_code") {
        value
      }
    }
  }
`

/** Lightweight product handles + images for sitemap generation. */
export const GET_PRODUCTS_SITEMAP = `
  query GetProductsSitemap($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        cursor
        node {
          handle
          updatedAt
          featuredImage {
            url
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

/** Lightweight collection list for sitemap + SEO lookups. */
export const GET_COLLECTIONS_SITEMAP = `
  query GetCollectionsSitemap($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        cursor
        node {
          handle
          title
          updatedAt
          image {
            url
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

/** Online Store pages for sitemap. */
export const GET_PAGES = `
  query GetPages($first: Int!, $after: String) {
    pages(first: $first, after: $after) {
      edges {
        cursor
        node {
          handle
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

/** Single collection by handle (SEO + presentation). */
export const GET_COLLECTION_BY_HANDLE = `
  query GetCollectionByHandle($handle: String!) {
    collection(handle: $handle) {
      ${COLLECTION_FIELDS}
    }
  }
`

/** Resolve products by GID for wishlist hydration (preserves caller order). */
export const GET_PRODUCTS_BY_IDS = `
  query GetProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        ${PRODUCT_FIELDS}
      }
    }
  }
`

/** Product collections by handle — used to resolve related-product source. */
export const GET_PRODUCT_COLLECTIONS = `
  query GetProductCollections($handle: String!) {
    product(handle: $handle) {
      id
      handle
      productType
      tags
      collections(first: 25) {
        edges {
          node {
            handle
            title
          }
        }
      }
    }
  }
`

/** Paginated collection list. */
export const GET_COLLECTIONS = `
  query GetCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        cursor
        node {
          ${COLLECTION_FIELDS}
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

/** Collection by handle, including its products. */
export const GET_COLLECTION_PRODUCTS = `
  query GetCollectionProducts($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      ${COLLECTION_FIELDS}
      products(first: $first, after: $after) {
        edges {
          cursor
          node {
            ${PRODUCT_FIELDS}
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`

const SHOP_POLICY_FIELDS = `
  title
  body
  handle
`

const SHOP_CONTENT_METAFIELDS = `
  businessEmail: metafield(namespace: "swift", key: "business_email") {
    value
  }
  responseTime: metafield(namespace: "swift", key: "response_time") {
    value
  }
  instagramUrl: metafield(namespace: "swift", key: "instagram_url") {
    value
  }
  xUrl: metafield(namespace: "swift", key: "x_url") {
    value
  }
  discordUrl: metafield(namespace: "swift", key: "discord_url") {
    value
  }
  youtubeUrl: metafield(namespace: "swift", key: "youtube_url") {
    value
  }
`

/** Online Store page by handle (About, Contact, FAQ, etc.). */
export const GET_PAGE_BY_HANDLE = `
  query GetPageByHandle($handle: String!) {
    page(handle: $handle) {
      id
      handle
      title
      body
      bodySummary
      seo {
        title
        description
      }
      ${SHOP_CONTENT_METAFIELDS}
    }
  }
`

/**
 * Shop policies + shared contact/social metafields.
 * Policies use Shopify's native Policy resources.
 */
export const GET_SHOP_CONTENT = `
  query GetShopContent {
    shop {
      name
      privacyPolicy {
        ${SHOP_POLICY_FIELDS}
      }
      refundPolicy {
        ${SHOP_POLICY_FIELDS}
      }
      shippingPolicy {
        ${SHOP_POLICY_FIELDS}
      }
      termsOfService {
        ${SHOP_POLICY_FIELDS}
      }
      ${SHOP_CONTENT_METAFIELDS}
    }
  }
`

/**
 * Leaf metaobject fields (file / product / collection refs).
 * Used for nested Homepage references — one level deep.
 */
const METAOBJECT_LEAF_FIELDS = `
  id
  handle
  type
  fields {
    key
    value
    reference {
      __typename
      ... on MediaImage {
        image {
          url
          altText
          width
          height
        }
      }
      ... on Product {
        ${PRODUCT_FIELDS}
      }
      ... on Collection {
        ${COLLECTION_FIELDS}
      }
    }
  }
`

/**
 * Shared fields for storefront marketing metaobjects.
 * Expands file, product, and collection references for homepage merchandising.
 */
const METAOBJECT_FIELDS = `
  id
  handle
  type
  fields {
    key
    value
    reference {
      __typename
      ... on MediaImage {
        image {
          url
          altText
          width
          height
        }
      }
      ... on Product {
        ${PRODUCT_FIELDS}
      }
      ... on Collection {
        ${COLLECTION_FIELDS}
      }
    }
  }
`

/**
 * Paginated metaobjects by type (heroes, visuals, homepage merchandising).
 * Requires Storefront permission `unauthenticated_read_metaobjects` and
 * storefront-accessible metaobject definitions.
 */
export const GET_METAOBJECTS_BY_TYPE = `
  query GetMetaobjectsByType($type: String!, $first: Int!, $after: String) {
    metaobjects(type: $type, first: $first, after: $after) {
      edges {
        cursor
        node {
          ${METAOBJECT_FIELDS}
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

/**
 * Homepage orchestration metaobject — nested hero / promotion / featured refs.
 * List fields use `references`; singletons use `reference`.
 */
export const GET_HOMEPAGE = `
  query GetHomepage($type: String!, $first: Int!) {
    metaobjects(type: $type, first: $first) {
      edges {
        node {
          id
          handle
          type
          fields {
            key
            value
            reference {
              __typename
              ... on Metaobject {
                ${METAOBJECT_LEAF_FIELDS}
              }
            }
            references(first: 50) {
              edges {
                node {
                  __typename
                  ... on Metaobject {
                    ${METAOBJECT_LEAF_FIELDS}
                  }
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
