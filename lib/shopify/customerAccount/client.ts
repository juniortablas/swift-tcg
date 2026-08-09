/**
 * Authenticated Customer Account API GraphQL client.
 */

import { ShopifyClientError } from "../client"
import { discoverCustomerAccountApi } from "./discovery"
import { refreshCustomerAccessToken } from "./oauth"
import {
  clearCustomerSession,
  readCustomerSession,
  type CustomerSessionTokens,
} from "./session"

type GraphQLResponse<T> = {
  data?: T
  errors?: Array<{ message: string; extensions?: { code?: string } }>
}

const ACCESS_TOKEN_SKEW_MS = 30_000

async function resolveAccessToken(): Promise<CustomerSessionTokens> {
  const session = await readCustomerSession()
  if (!session) {
    throw new ShopifyClientError("Not signed in.", 401)
  }

  if (Date.now() < session.expiresAt - ACCESS_TOKEN_SKEW_MS) {
    return session
  }

  try {
    return await refreshCustomerAccessToken(session.refreshToken)
  } catch (error) {
    await clearCustomerSession()
    throw error
  }
}

/**
 * Execute a Customer Account API GraphQL request for the current session.
 */
export async function customerAccountFetch<T>({
  query,
  variables,
}: {
  query: string
  variables?: Record<string, unknown>
}): Promise<T> {
  const session = await resolveAccessToken()
  const { graphql_api } = await discoverCustomerAccountApi()

  const response = await fetch(graphql_api, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: session.accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  })

  if (response.status === 401) {
    // One refresh retry, then clear session.
    try {
      const refreshed = await refreshCustomerAccessToken(session.refreshToken)
      const retry = await fetch(graphql_api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: refreshed.accessToken,
        },
        body: JSON.stringify({ query, variables }),
        cache: "no-store",
      })
      if (!retry.ok) {
        await clearCustomerSession()
        throw new ShopifyClientError(
          `Customer Account API unauthorized (${retry.status}).`,
          retry.status
        )
      }
      const retryJson = (await retry.json()) as GraphQLResponse<T>
      if (retryJson.errors?.length) {
        throw new ShopifyClientError(
          `Customer Account GraphQL error: ${retryJson.errors.map((e) => e.message).join("; ")}`,
          retry.status,
          retryJson.errors
        )
      }
      if (retryJson.data === undefined) {
        throw new ShopifyClientError(
          "Customer Account response did not include data."
        )
      }
      return retryJson.data
    } catch (error) {
      await clearCustomerSession()
      throw error
    }
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new ShopifyClientError(
      `Customer Account API request failed (${response.status}): ${body || response.statusText}`,
      response.status
    )
  }

  const json = (await response.json()) as GraphQLResponse<T>

  if (json.errors?.length) {
    throw new ShopifyClientError(
      `Customer Account GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
      response.status,
      json.errors
    )
  }

  if (json.data === undefined) {
    throw new ShopifyClientError(
      "Customer Account response did not include data."
    )
  }

  return json.data
}

/** Return a valid access token for Storefront cart buyer identity. */
export async function getCustomerAccessToken(): Promise<string | null> {
  try {
    const session = await resolveAccessToken()
    return session.accessToken
  } catch {
    return null
  }
}
