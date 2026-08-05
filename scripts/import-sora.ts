/**
 * SORA CardShop multi-catalog importer
 *
 * Crawls configured game catalogs, extracts product metadata, downloads
 * images into public/products/, and writes one JSON file per catalog under
 * data/. Existing image files are never overwritten.
 *
 * Usage: npx tsx scripts/import-sora.ts
 *
 * To support another game, add one entry to CATALOGS.
 */

import axios from "axios"
import * as cheerio from "cheerio"
import type { Element } from "domhandler"
import { createWriteStream } from "node:fs"
import { access, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { setTimeout as delay } from "node:timers/promises"

const BASE_URL = "https://sora-cardshop.com"

const ROOT = process.cwd()
const PRODUCTS_DIR = path.join(ROOT, "public", "products")
const DATA_DIR = path.join(ROOT, "data")

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const DOWNLOAD_DELAY_MS = 300
const MAX_PAGES = 100

const CATALOGS = [
  {
    slug: "pokemon",
    category: "Pokémon TCG",
  },
  {
    slug: "onepiece",
    category: "One Piece TCG",
  },
] as const

type CatalogConfig = (typeof CATALOGS)[number]

export interface ImportedProduct {
  id: string
  slug: string
  title: string
  category: string
  image: string
  price: number | null
  url: string
}

/** Internal product with remote image URL used only during download. */
interface ScrapedProduct {
  id: string
  title: string
  category: string
  imageUrl: string
  price: number | null
}

interface CatalogProduct extends ImportedProduct {
  imageUrl: string
}

interface CatalogSummary {
  slug: string
  category: string
  products: number
  downloaded: number
  skipped: number
  failed: number
  jsonPath: string
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function absoluteUrl(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) return src
  return new URL(src, BASE_URL).toString()
}

/** Preserve the source file's final extension (e.g. .webp, .jpg). */
function extensionFromUrl(imageUrl: string): string {
  const pathname = new URL(imageUrl).pathname
  const ext = path.extname(pathname).toLowerCase()
  return ext || ".webp"
}

/**
 * SEO-friendly slug from a product title.
 * Ignores bracketed set codes like [M1S], [SV11B].
 *
 * "Mega Symphonia [M1S]" → "mega-symphonia"
 */
export function slugify(title: string): string {
  return title
    .replace(/\[[^\]]*\]/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
}

/** Ensure slug uniqueness: mega-symphonia, mega-symphonia-2, … */
function uniqueSlug(base: string, used: Set<string>): string {
  const root = base || "product"
  if (!used.has(root)) {
    used.add(root)
    return root
  }

  let n = 2
  while (used.has(`${root}-${n}`)) n += 1
  const slug = `${root}-${n}`
  used.add(slug)
  return slug
}

/**
 * Assign unique SEO slugs and image paths from titles.
 * Shared `usedSlugs` keeps filenames unique across catalogs.
 */
function applyImageSlugs(
  products: ScrapedProduct[],
  usedSlugs: Set<string>
): CatalogProduct[] {
  return products.map((product) => {
    const base = slugify(product.title) || slugify(product.id) || "product"
    const slug = uniqueSlug(base, usedSlugs)
    const filename = `${slug}${extensionFromUrl(product.imageUrl)}`
    return {
      id: product.id,
      slug,
      title: product.title,
      category: product.category,
      image: `/products/${filename}`,
      price: product.price,
      url: `/products/${slug}`,
      imageUrl: product.imageUrl,
    }
  })
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function catalogPageUrl(slug: string, page: number): string {
  const url = new URL(`/catalog/${slug}`, BASE_URL)
  if (page > 1) url.searchParams.set("page", String(page))
  return url.toString()
}

function dataFileForCatalog(slug: string): string {
  return path.join(DATA_DIR, `${slug}.json`)
}

/** Fetch a single catalog page as HTML. */
async function fetchCatalog(slug: string, page = 1): Promise<string> {
  const url = catalogPageUrl(slug, page)
  console.log(`  Fetching page ${page}: ${url}`)
  const response = await axios.get<string>(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    responseType: "text",
    timeout: 30_000,
  })
  return response.data
}

function extractPrice($card: cheerio.Cheerio<Element>): number | null {
  if ($card.find(".price-locked").length > 0) {
    return null
  }

  const dataJpy =
    $card.find("[data-jpy]").attr("data-jpy") ||
    $card.find("[data-price]").attr("data-price")
  if (dataJpy) {
    const parsed = Number(dataJpy.replace(/,/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }

  const priceText = cleanText(
    $card.find(".product-price, .price, .price-value").first().text()
  )
  if (priceText) {
    const match = priceText.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/)
    if (match) {
      const parsed = Number(match[1])
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

/**
 * Parse product cards from a catalog HTML page.
 * Category comes from the CATALOGS config so new games only need an array entry.
 */
function parseProducts(html: string, category: string): ScrapedProduct[] {
  const $ = cheerio.load(html)
  const products: ScrapedProduct[] = []
  const seen = new Set<string>()

  // htmlparser2 moves block content out of <a.product-card-link>,
  // so we read .product-card and take the preceding link for the id.
  $(".product-card").each((_, card) => {
    const $card = $(card)
    const href =
      $card.prev("a.product-card-link").attr("href") ??
      $card.prevAll("a.product-card-link").first().attr("href") ??
      ""
    const idMatch = href.match(/\/product\/([^/?#]+)/i)
    if (!idMatch) return

    const id = idMatch[1]
    if (seen.has(id)) return

    const title = cleanText($card.find(".product-name").first().text())
    const src =
      $card.find(".product-img-wrap img").attr("src") ||
      $card.find("img").attr("src") ||
      ""

    if (!title || !src) {
      console.warn(`  Skipping ${id}: missing title or image`)
      return
    }

    seen.add(id)
    products.push({
      id,
      title,
      category,
      imageUrl: absoluteUrl(src),
      price: extractPrice($card),
    })
  })

  return products
}

function detectMaxPage(html: string): number | null {
  const $ = cheerio.load(html)
  let maxPage: number | null = null

  $("a[href*='page=']").each((_, el) => {
    const href = $(el).attr("href")
    if (!href) return
    try {
      const page = Number(new URL(href, BASE_URL).searchParams.get("page"))
      if (Number.isFinite(page) && page > 0) {
        maxPage = Math.max(maxPage ?? page, page)
      }
    } catch {
      // ignore malformed hrefs
    }
  })

  return maxPage
}

/** Crawl every page for a catalog slug and return deduped products. */
async function fetchAllProducts(
  catalog: CatalogConfig
): Promise<ScrapedProduct[]> {
  const products: ScrapedProduct[] = []
  const seen = new Set<string>()
  let page = 1
  let knownMaxPage: number | null = null

  while (page <= MAX_PAGES) {
    if (knownMaxPage !== null && page > knownMaxPage) break

    let html: string
    try {
      html = await fetchCatalog(catalog.slug, page)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  Failed to fetch page ${page}: ${message}`)
      break
    }

    if (page === 1) {
      knownMaxPage = detectMaxPage(html)
      if (knownMaxPage !== null) {
        console.log(`  Detected pagination up to page ${knownMaxPage}`)
      }
    }

    const pageProducts = parseProducts(html, catalog.category)
    if (pageProducts.length === 0) {
      console.log(`  Page ${page} returned no products — stopping`)
      break
    }

    let newCount = 0
    for (const product of pageProducts) {
      if (seen.has(product.id)) continue
      seen.add(product.id)
      products.push(product)
      newCount += 1
    }

    console.log(
      `  Page ${page}: ${pageProducts.length} products (${newCount} new)`
    )

    if (newCount === 0) {
      console.log(`  No new products on page ${page} — stopping`)
      break
    }

    // Probe page 2 when the site exposes no pagination links.
    if (knownMaxPage === null && page === 1) {
      try {
        const probeHtml = await fetchCatalog(catalog.slug, 2)
        const probeProducts = parseProducts(probeHtml, catalog.category)
        const probeNew = probeProducts.filter((p) => !seen.has(p.id)).length
        if (probeNew === 0) {
          console.log("  Page 2 has no new products — single-page catalog")
          break
        }
        for (const product of probeProducts) {
          if (seen.has(product.id)) continue
          seen.add(product.id)
          products.push(product)
        }
        console.log(
          `  Page 2: ${probeProducts.length} products (${probeNew} new)`
        )
        page = 3
        continue
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`  Failed to probe page 2: ${message}`)
        break
      }
    }

    page += 1
  }

  return products
}

async function downloadImage(
  imageUrl: string,
  destPath: string
): Promise<"downloaded" | "skipped" | "failed"> {
  if (await fileExists(destPath)) {
    return "skipped"
  }

  try {
    const response = await axios.get(imageUrl, {
      headers: { "User-Agent": USER_AGENT, Referer: BASE_URL },
      responseType: "stream",
      timeout: 60_000,
    })

    await pipeline(response.data, createWriteStream(destPath))
    return "downloaded"
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`  Failed to download ${imageUrl}: ${message}`)
    return "failed"
  }
}

/** Download product images; skips existing files and continues on failure. */
async function downloadImages(
  products: CatalogProduct[]
): Promise<Pick<CatalogSummary, "downloaded" | "skipped" | "failed">> {
  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (const product of products) {
    try {
      const filename = path.basename(product.image)
      const destPath = path.join(PRODUCTS_DIR, filename)
      const result = await downloadImage(product.imageUrl, destPath)

      if (result === "downloaded") {
        downloaded += 1
        console.log(`  Downloaded ${filename}`)
        await delay(DOWNLOAD_DELAY_MS)
      } else if (result === "skipped") {
        skipped += 1
        console.log(`  Skipped existing ${filename}`)
      } else {
        failed += 1
        await delay(DOWNLOAD_DELAY_MS)
      }
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  Unexpected error for ${product.id}: ${message}`)
      await delay(DOWNLOAD_DELAY_MS)
    }
  }

  return { downloaded, skipped, failed }
}

/** Serialize products to the public JSON shape (no remote imageUrl). */
function toJsonProduct(product: CatalogProduct): ImportedProduct {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    category: product.category,
    image: product.image,
    price: product.price,
    url: product.url,
  }
}

/** Write catalog products to data/{slug}.json. */
async function writeJson(
  slug: string,
  products: CatalogProduct[]
): Promise<string> {
  const jsonPath = dataFileForCatalog(slug)
  const payload = products.map(toJsonProduct)
  await writeFile(jsonPath, JSON.stringify(payload, null, 2) + "\n", "utf8")
  console.log(`  Wrote ${jsonPath}`)
  return jsonPath
}

function printCatalogSummary(summary: CatalogSummary) {
  console.log(`\n── ${summary.category} (${summary.slug}) ──`)
  console.log(`  Products:   ${summary.products}`)
  console.log(`  Downloaded: ${summary.downloaded}`)
  console.log(`  Skipped:    ${summary.skipped}`)
  console.log(`  Failed:     ${summary.failed}`)
  console.log(`  JSON:       ${summary.jsonPath}`)
}

async function importCatalog(
  catalog: CatalogConfig,
  usedSlugs: Set<string>
): Promise<CatalogSummary> {
  console.log(`\n=== Importing ${catalog.category} [${catalog.slug}] ===`)

  const parsed = await fetchAllProducts(catalog)
  const products = applyImageSlugs(parsed, usedSlugs)
  console.log(`  Parsed ${products.length} products`)

  const { downloaded, skipped, failed } = await downloadImages(products)
  const jsonPath = await writeJson(catalog.slug, products)

  return {
    slug: catalog.slug,
    category: catalog.category,
    products: products.length,
    downloaded,
    skipped,
    failed,
    jsonPath,
  }
}

async function main() {
  await mkdir(PRODUCTS_DIR, { recursive: true })
  await mkdir(DATA_DIR, { recursive: true })

  const summaries: CatalogSummary[] = []
  const usedSlugs = new Set<string>()

  for (const catalog of CATALOGS) {
    try {
      const summary = await importCatalog(catalog, usedSlugs)
      summaries.push(summary)
      printCatalogSummary(summary)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(
        `\nCatalog ${catalog.slug} failed — continuing. ${message}`
      )
      summaries.push({
        slug: catalog.slug,
        category: catalog.category,
        products: 0,
        downloaded: 0,
        skipped: 0,
        failed: 0,
        jsonPath: dataFileForCatalog(catalog.slug),
      })
    }
  }

  console.log("\n========== Import complete ==========")
  for (const summary of summaries) {
    printCatalogSummary(summary)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
