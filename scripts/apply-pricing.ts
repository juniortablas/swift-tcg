/**
 * Apply pricing engine to existing catalog JSON.
 *
 * Legacy rows store wholesale JPY in `price`. This script converts them to:
 *   cost  — wholesale USD
 *   price — retail USD (.99 charm)
 *
 * Usage: npx tsx scripts/apply-pricing.ts
 */

import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  calculateRetailPrice,
  priceFromWholesaleJpy,
} from "@/lib/pricing"

const ROOT = process.cwd()
const CATALOGS = ["pokemon", "onepiece"] as const

type RawRow = {
  id: string
  price?: number | null
  cost?: number | null
  [key: string]: unknown
}

function looksLikeJpy(value: number): boolean {
  // Retail USD charm prices are small; Sora wholesale JPY is typically thousands+.
  return value >= 500
}

function repriceRow(product: RawRow): RawRow {
  if (typeof product.cost === "number" && Number.isFinite(product.cost)) {
    const cost = Math.round(product.cost * 100) / 100
    return { ...product, cost, price: calculateRetailPrice(cost) }
  }

  if (typeof product.price === "number" && Number.isFinite(product.price)) {
    if (looksLikeJpy(product.price)) {
      const { cost, price } = priceFromWholesaleJpy(product.price)
      return { ...product, cost, price }
    }

    // Already looks like USD wholesale cost mistakenly stored as price.
    const cost = Math.round(product.price * 100) / 100
    return { ...product, cost, price: calculateRetailPrice(cost) }
  }

  return { ...product, cost: null, price: null }
}

async function repriceFile(slug: string): Promise<void> {
  const filePath = path.join(ROOT, "data", `${slug}.json`)
  const products = JSON.parse(await readFile(filePath, "utf8")) as RawRow[]

  let withPrice = 0
  let without = 0

  const next = products.map((product) => {
    const row = repriceRow(product)
    if (typeof row.price === "number") withPrice += 1
    else without += 1
    return row
  })

  await writeFile(filePath, JSON.stringify(next, null, 2) + "\n", "utf8")
  console.log(
    `${slug}: ${withPrice} priced, ${without} coming soon → ${filePath}`
  )
}

async function main() {
  for (const slug of CATALOGS) {
    await repriceFile(slug)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
