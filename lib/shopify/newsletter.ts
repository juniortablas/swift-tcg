/**
 * Shopify Admin newsletter capture.
 *
 * Creates a customer with email marketing consent, or updates consent on an
 * existing customer. Duplicate emails are treated as success.
 *
 * Requires Admin scopes: read_customers, write_customers.
 */

import { shopifyAdminFetch } from "./admin"
import { ShopifyClientError } from "./client"

/** Admin `UserError` — `field` + `message` only. `code` is not on this type. */
type UserError = {
  field?: string[] | null
  message: string
}

/** `customerEmailMarketingConsentUpdate` returns a specialized error with `code`. */
type ConsentUserError = UserError & {
  code?: string | null
}

type MarketingState =
  | "SUBSCRIBED"
  | "UNSUBSCRIBED"
  | "NOT_SUBSCRIBED"
  | "PENDING"
  | "INVALID"
  | "REDACTED"

type CustomerConsentNode = {
  id: string
  emailMarketingConsent?: { marketingState?: MarketingState | null } | null
}

function subscribedConsent() {
  return {
    marketingState: "SUBSCRIBED" as const,
    marketingOptInLevel: "SINGLE_OPT_IN" as const,
    consentUpdatedAt: new Date().toISOString(),
  }
}

function firstUserError<T extends UserError>(
  errors: T[] | undefined
): T | null {
  return errors?.[0] ?? null
}

function fieldPath(error: UserError): string {
  return error.field?.join(".") ?? ""
}

function isEmailTakenError(errors: UserError[]): boolean {
  return errors.some((error) =>
    /already been taken|has already been taken|email.*taken/i.test(error.message)
  )
}

function isInvalidEmailError(errors: UserError[]): boolean {
  return errors.some((error) => {
    if (/invalid email/i.test(error.message)) return true
    return /email/i.test(fieldPath(error)) && /invalid/i.test(error.message)
  })
}

function throwFromUserErrors(
  errors: UserError[],
  mutation: string
): never {
  const first = firstUserError(errors)
  throw new ShopifyClientError(
    `Shopify Admin ${mutation} failed: ${first?.message ?? "unknown user error"}`,
    502,
    errors
  )
}

async function findCustomerByEmail(
  email: string
): Promise<CustomerConsentNode | null> {
  const data = await shopifyAdminFetch<{
    customerByIdentifier: CustomerConsentNode | null
  }>({
    query: /* GraphQL */ `
      query NewsletterCustomerByEmail($identifier: CustomerIdentifierInput!) {
        customerByIdentifier(identifier: $identifier) {
          id
          emailMarketingConsent {
            marketingState
          }
        }
      }
    `,
    variables: { identifier: { emailAddress: email } },
  })

  return data.customerByIdentifier
}

async function createSubscribedCustomer(
  email: string
): Promise<"created" | "exists"> {
  const data = await shopifyAdminFetch<{
    customerCreate: {
      customer: CustomerConsentNode | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation NewsletterCustomerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            emailMarketingConsent {
              marketingState
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
      input: {
        email,
        emailMarketingConsent: subscribedConsent(),
      },
    },
  })

  const errors = data.customerCreate.userErrors
  if (data.customerCreate.customer && errors.length === 0) {
    return "created"
  }
  if (isEmailTakenError(errors)) return "exists"
  if (isInvalidEmailError(errors)) {
    throw new ShopifyClientError("Invalid email address.", 400, errors)
  }
  throwFromUserErrors(errors, "customerCreate")
}

async function updateEmailMarketingConsent(customerId: string): Promise<void> {
  const data = await shopifyAdminFetch<{
    customerEmailMarketingConsentUpdate: {
      customer: CustomerConsentNode | null
      userErrors: ConsentUserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation NewsletterConsentUpdate(
        $input: CustomerEmailMarketingConsentUpdateInput!
      ) {
        customerEmailMarketingConsentUpdate(input: $input) {
          customer {
            id
            emailMarketingConsent {
              marketingState
            }
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
      input: {
        customerId,
        emailMarketingConsent: subscribedConsent(),
      },
    },
  })

  const errors = data.customerEmailMarketingConsentUpdate.userErrors
  if (errors.length === 0) return

  // Existing customers must still succeed. Shopify may refuse to move
  // UNSUBSCRIBED → SUBSCRIBED; that is expected, not a client-facing error.
  const first = firstUserError(errors)
  console.warn(
    "[newsletter] consent update skipped for existing customer",
    first?.code ?? first?.message
  )
}

async function subscribeExistingCustomer(
  customer: CustomerConsentNode
): Promise<void> {
  if (customer.emailMarketingConsent?.marketingState === "SUBSCRIBED") {
    return
  }
  await updateEmailMarketingConsent(customer.id)
}

/**
 * Create or update a Shopify customer with email marketing consent.
 * Duplicate emails never throw — consent is updated when Shopify allows it.
 */
export async function subscribeShopifyNewsletterCustomer(
  email: string
): Promise<void> {
  const existing = await findCustomerByEmail(email)
  if (existing) {
    await subscribeExistingCustomer(existing)
    return
  }

  const created = await createSubscribedCustomer(email)
  if (created === "exists") {
    const raced = await findCustomerByEmail(email)
    if (raced) await subscribeExistingCustomer(raced)
  }
}
