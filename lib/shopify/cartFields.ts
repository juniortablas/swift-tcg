/**
 * Shared GraphQL selection set for Storefront Cart responses.
 *
 * Mutations use `CART_FIELDS` (no reservation metafields). Cart loads,
 * reservation adds, and checkout revalidation use `CART_FIELDS_WITH_RESTOCK`.
 */

function cartSelection(includeRestockMetafields: boolean): string {
  const restockMetafields = includeRestockMetafields
    ? `
              weeklyRestockLimit: metafield(namespace: "custom", key: "weekly_restock_limit") {
                value
              }
              currentWeeklyReservations: metafield(namespace: "custom", key: "current_weekly_reservations") {
                value
              }`
    : ""

  return `
  id
  checkoutUrl
  totalQuantity
  attributes {
    key
    value
  }
  cost {
    subtotalAmount {
      amount
      currencyCode
    }
  }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        attributes {
          key
          value
        }
        merchandise {
          ... on ProductVariant {
            id
            availableForSale
            quantityAvailable
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
            product {
              id
              handle
              title
              tags${restockMetafields}
              featuredImage {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
  }
`
}

/** Light cart fields for mutations — no reservation metafield reads. */
export const CART_FIELDS = cartSelection(false)

/** Cart load / checkout revalidation — includes reservation counters. */
export const CART_FIELDS_WITH_RESTOCK = cartSelection(true)

export const GET_CART = `
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
      ${CART_FIELDS_WITH_RESTOCK}
    }
  }
`

/** Resolve a product + first variants for merchandise / inventory checks. */
export const GET_PRODUCT_FOR_CART = `
  query GetProductForCart($id: ID!) {
    product: node(id: $id) {
      ... on Product {
        id
        handle
        title
        tags
        availableForSale
        totalInventory
        allowWeeklyRestock: metafield(namespace: "custom", key: "allow_weekly_restock") {
          value
        }
        weeklyRestockLimit: metafield(namespace: "custom", key: "weekly_restock_limit") {
          value
        }
        currentWeeklyReservations: metafield(namespace: "custom", key: "current_weekly_reservations") {
          value
        }
        featuredImage {
          url
          altText
          width
          height
        }
        variants(first: 25) {
          edges {
            node {
              id
              availableForSale
              quantityAvailable
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
            }
          }
        }
      }
    }
  }
`
