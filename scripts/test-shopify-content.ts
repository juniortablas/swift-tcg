/**
 * One-off: verify Storefront pages + policies access.
 * Usage: npx tsx scripts/test-shopify-content.ts
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { getShopifyConfig, shopifyFetch } from "@/lib/shopify/client"
import { GET_PAGE_BY_HANDLE, GET_SHOP_CONTENT } from "@/lib/shopify/queries"
import type {
  PageByHandleQueryResult,
  ShopContentQueryResult,
} from "@/lib/shopify/types"

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
  console.log(`Connecting to ${config.storeDomain}...`)

  const shop = await shopifyFetch<ShopContentQueryResult>({
    query: GET_SHOP_CONTENT,
    config,
  })

  console.log(`Shop: ${shop.shop.name}`)
  console.log("Policies:")
  for (const key of [
    "privacyPolicy",
    "refundPolicy",
    "shippingPolicy",
    "termsOfService",
  ] as const) {
    const policy = shop.shop[key]
    console.log(
      `  ${key}: ${policy ? `${policy.title} (${policy.handle})` : "(not set)"}`
    )
  }

  console.log("Shop metafields (swift.*):")
  console.log(`  business_email: ${shop.shop.businessEmail?.value ?? "(none)"}`)
  console.log(`  response_time: ${shop.shop.responseTime?.value ?? "(none)"}`)
  console.log(`  instagram_url: ${shop.shop.instagramUrl?.value ?? "(none)"}`)
  console.log(`  x_url: ${shop.shop.xUrl?.value ?? "(none)"}`)
  console.log(`  discord_url: ${shop.shop.discordUrl?.value ?? "(none)"}`)
  console.log(`  youtube_url: ${shop.shop.youtubeUrl?.value ?? "(none)"}`)

  console.log("Pages:")
  for (const handle of ["about", "contact", "faq", "preorder-policy"]) {
    const data = await shopifyFetch<PageByHandleQueryResult>({
      query: GET_PAGE_BY_HANDLE,
      variables: { handle },
      config,
    })
    console.log(
      `  ${handle}: ${data.page ? data.page.title : "(missing — create in Shopify)"}`
    )
  }

  console.log("Content API OK.")
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`test-shopify-content failed: ${message}`)
  process.exitCode = 1
})
