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

/** Single product by handle (slug). */
export const GET_PRODUCT_BY_HANDLE = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      ${PRODUCT_FIELDS}
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

/** Shared fields for storefront marketing metaobjects (Hero / Visual). */
const METAOBJECT_FIELDS = `
  id
  handle
  type
  fields {
    key
    value
    reference {
      ... on MediaImage {
        image {
          url
          altText
          width
          height
        }
      }
    }
  }
`

/**
 * Paginated metaobjects by type (`storefront_hero` / `storefront_visual`).
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
