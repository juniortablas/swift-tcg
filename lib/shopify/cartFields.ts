/**
 * Shared GraphQL selection set for Storefront Cart responses.
 */

export const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
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
              tags
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

export const GET_CART = `
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
      ${CART_FIELDS}
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
