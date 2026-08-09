/**
 * Customer Account API GraphQL documents.
 */

const MONEY_FIELDS = `
  amount
  currencyCode
`

const ADDRESS_FIELDS = `
  id
  firstName
  lastName
  company
  address1
  address2
  city
  province
  zoneCode
  zip
  country
  territoryCode
  phoneNumber
  formatted
`

export const CUSTOMER_DASHBOARD_QUERY = `
  query CustomerDashboard {
    customer {
      id
      displayName
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      defaultAddress {
        id
      }
      orders(first: 5, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          statusPageUrl
          totalPrice {
            ${MONEY_FIELDS}
          }
        }
      }
    }
  }
`

export const CUSTOMER_PROFILE_QUERY = `
  query CustomerProfile {
    customer {
      id
      displayName
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      defaultAddress {
        id
      }
    }
  }
`

export const CUSTOMER_ORDERS_QUERY = `
  query CustomerOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          statusPageUrl
          totalPrice {
            ${MONEY_FIELDS}
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

export const CUSTOMER_ORDER_QUERY = `
  query CustomerOrder($id: ID!) {
    order(id: $id) {
      id
      name
      processedAt
      financialStatus
      fulfillmentStatus
      statusPageUrl
      email
      totalPrice {
        ${MONEY_FIELDS}
      }
      subtotal {
        ${MONEY_FIELDS}
      }
      totalShipping {
        ${MONEY_FIELDS}
      }
      totalTax {
        ${MONEY_FIELDS}
      }
      totalRefunded {
        ${MONEY_FIELDS}
      }
      shippingAddress {
        ${ADDRESS_FIELDS}
      }
      billingAddress {
        ${ADDRESS_FIELDS}
      }
      lineItems(first: 50) {
        nodes {
          id
          name
          quantity
          variantTitle
          image {
            url
          }
          totalPrice {
            ${MONEY_FIELDS}
          }
        }
      }
    }
  }
`

export const CUSTOMER_ADDRESSES_QUERY = `
  query CustomerAddresses {
    customer {
      defaultAddress {
        id
      }
      addresses(first: 25) {
        nodes {
          ${ADDRESS_FIELDS}
        }
      }
    }
  }
`

export const CUSTOMER_UPDATE_MUTATION = `
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        firstName
        lastName
        displayName
        emailAddress {
          emailAddress
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

export const CUSTOMER_ADDRESS_CREATE_MUTATION = `
  mutation CustomerAddressCreate(
    $address: CustomerAddressInput!
    $defaultAddress: Boolean
  ) {
    customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
      customerAddress {
        ${ADDRESS_FIELDS}
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

export const CUSTOMER_ADDRESS_UPDATE_MUTATION = `
  mutation CustomerAddressUpdate(
    $addressId: ID!
    $address: CustomerAddressInput
    $defaultAddress: Boolean
  ) {
    customerAddressUpdate(
      addressId: $addressId
      address: $address
      defaultAddress: $defaultAddress
    ) {
      customerAddress {
        ${ADDRESS_FIELDS}
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`

export const CUSTOMER_ADDRESS_DELETE_MUTATION = `
  mutation CustomerAddressDelete($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) {
      deletedAddressId
      userErrors {
        field
        message
        code
      }
    }
  }
`
