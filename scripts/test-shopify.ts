/**
 * Verify Shopify Storefront API connectivity.
 *
 * Loads credentials from `.env.local` (or `.env`), fetches products directly,
 * and prints each product's title and handle.
 *
 * Usage: npm run shopify:test
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { getShopifyConfig, shopifyFetch } from "@/lib/shopify/client"
import { GET_PRODUCTS } from "@/lib/shopify/queries"
import type { ProductsQueryResult } from "@/lib/shopify/types"

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

async function main(): Promise<void> {
  loadEnvFile(".env.local")
  loadEnvFile(".env")

  const config = getShopifyConfig()
  console.log(
    `Connecting to ${config.storeDomain} (API ${config.apiVersion})...`
  )

  const data = await shopifyFetch<ProductsQueryResult>({
    query: GET_PRODUCTS,
    variables: { first: 10 },
    config,
  })

  const products = data.products.edges.map((edge) => edge.node)

  if (products.length === 0) {
    console.log("Connected successfully, but no products were returned.")
    console.log(
      "Publish at least one product to the Headless / Storefront channel and retry."
    )
    return
  }

  console.log(`Products (${products.length}):`)
  for (const product of products) {
    console.log(`- ${product.title} (${product.handle})`)
  }

  console.log("Shopify Storefront connection OK.")
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`shopify:test failed: ${message}`)
  process.exitCode = 1
})
