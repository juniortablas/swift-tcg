/**
 * Verify Shopify New Customer Accounts + Customer Account API discovery.
 * Run: npx tsx scripts/verify-customer-accounts.ts
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { shopifyAdminFetch } from "../lib/shopify/admin"
import { getShopifyConfig } from "../lib/shopify/client"

function loadEnvFile(filename: string): void {
  const filePath = path.resolve(process.cwd(), filename)
  if (!existsSync(filePath)) return

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

async function main() {
  loadEnvFile(".env.local")
  loadEnvFile(".env")

  const { storeDomain } = getShopifyConfig()
  const domain = storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")

  console.log(`Store: ${domain}\n`)

  // 1) Admin: customer account version
  try {
    const data = await shopifyAdminFetch<{
      shop: {
        name: string
        customerAccountsV2: {
          customerAccountsVersion: string
          loginLinksVisibleOnStorefrontAndCheckout: boolean
          loginRequiredAtCheckout: boolean
          url: string | null
        }
      }
    }>({
      query: `#graphql
      query CustomerAccountsConfig {
        shop {
          name
          customerAccountsV2 {
            customerAccountsVersion
            loginLinksVisibleOnStorefrontAndCheckout
            loginRequiredAtCheckout
            url
          }
        }
      }
    `,
    })
    console.log("=== Admin customerAccountsV2 ===")
    console.log(JSON.stringify(data.shop, null, 2))
  } catch (error) {
    console.error("Admin customerAccountsV2 query failed:")
    console.error(error instanceof Error ? error.message : error)
  }

  // 2) OpenID discovery (New Customer Accounts IdP)
  const openIdUrl = `https://${domain}/.well-known/openid-configuration`
  console.log(`\n=== OpenID discovery (${openIdUrl}) ===`)
  try {
    const res = await fetch(openIdUrl)
    const text = await res.text()
    console.log(`HTTP ${res.status}`)
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2))
    } catch {
      console.log(text.slice(0, 500))
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
  }

  // 3) Customer Account API discovery
  const apiUrl = `https://${domain}/.well-known/customer-account-api`
  console.log(`\n=== Customer Account API discovery (${apiUrl}) ===`)
  try {
    const res = await fetch(apiUrl)
    const text = await res.text()
    console.log(`HTTP ${res.status}`)
    try {
      console.log(JSON.stringify(JSON.parse(text), null, 2))
    } catch {
      console.log(text.slice(0, 500))
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
  }

  // 4) Env readiness for headless OAuth
  console.log("\n=== Env readiness ===")
  const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim()
  const shopId = process.env.SHOPIFY_SHOP_ID?.trim()
  const appUrl = process.env.SHOPIFY_APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  console.log(
    `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: ${clientId ? "set" : "MISSING (Headless → Customer Account API → Client ID)"}`
  )
  console.log(
    `SHOPIFY_SHOP_ID: ${shopId ? "set" : "optional (can derive from discovery / shop)"}`
  )
  console.log(
    `SHOPIFY_APP_URL / NEXT_PUBLIC_APP_URL: ${appUrl ? appUrl : "MISSING (HTTPS origin for OAuth callbacks)"}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
