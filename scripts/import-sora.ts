/**
 * SORA CardShop multi-catalog importer
 *
 * Authenticates via Playwright (session cookies in playwright/.auth/sora.json),
 * crawls configured game catalogs with wholesale prices unlocked, extracts
 * product metadata + availability, prices via `@/lib/pricing` (cost + retail),
 * downloads images into public/products/, and writes one JSON file per catalog
 * under data/.
 *
 * Existing image files are never overwritten.
 * Email/password are never stored — only browser storage state (cookies).
 * Wholesale `cost` is stored in JSON but must never be shown in the UI.
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
import type { APIRequestContext } from "playwright"

import type { ProductStatus } from "@/types/product"
import { priceFromWholesaleJpy } from "@/lib/pricing"
import {
  createSoraRequest,
  SORA_BASE_URL,
} from "./sora-auth"

const BASE_URL = SORA_BASE_URL

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
  /** Wholesale USD cost (from Sora JPY). Null when unavailable. */
  cost: number | null
  /** Retail USD price. Null when there is no wholesale cost. */
  price: number | null
  url: string
  status: ProductStatus
}

/** Internal product with remote image URL used only during download. */
interface ScrapedProduct {
  id: string
  title: string
  category: string
  imageUrl: string
  /** Wholesale JPY from Sora (`data-jpy`). */
  wholesaleJpy: number | null
  status: ProductStatus
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
    const { cost, price } = priceFromWholesaleJpy(product.wholesaleJpy)
    return {
      id: product.id,
      slug,
      title: product.title,
      category: product.category,
      image: `/products/${filename}`,
      cost,
      price,
      url: `/products/${slug}`,
      status: product.status,
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

/**
 * Debug dump for the first Pokémon catalog page (no scraping changes).
 * Writes raw HTML and logs auth/parse diagnostics.
 */
async function dumpPokemonCatalogPageDebug(
  response: { url: () => string; status: () => number },
  html: string
): Promise<void> {
  const debugDir = path.join(ROOT, "debug")
  const debugPath = path.join(debugDir, "pokemon-page.html")
  await mkdir(debugDir, { recursive: true })
  await writeFile(debugPath, html, "utf8")

  const $ = cheerio.load(html)
  const title = cleanText($("title").first().text())
  const hasProductCard = $(".product-card").length > 0
  const hasLoginForm =
    $('form[action*="login"]').length > 0 ||
    $('input[name="password"]').length > 0 ||
    $('input[type="password"]').length > 0
  const hasSignInOrLogin = /Sign In|Login/i.test(html)

  console.log("\n  === DEBUG: pokemon catalog page 1 ===")
  console.log(`  Final response URL: ${response.url()}`)
  console.log(`  HTTP status: ${response.status()}`)
  console.log(`  Page title: ${title || "(none)"}`)
  console.log(`  .product-card exists: ${hasProductCard}`)
  console.log(`  Login form present: ${hasLoginForm}`)
  console.log(`  Contains "Sign In" or "Login": ${hasSignInOrLogin}`)
  console.log(`  Saved HTML → ${debugPath}\n`)
}

/** Fetch a single catalog page as HTML (authenticated). */
async function fetchCatalog(
  api: APIRequestContext,
  slug: string,
  page = 1
): Promise<string> {
  const url = catalogPageUrl(slug, page)
  console.log(`  Fetching page ${page}: ${url}`)
  const response = await api.get(url, { timeout: 30_000 })
  const html = await response.text()

  if (slug === "pokemon" && page === 1) {
    await dumpPokemonCatalogPageDebug(response, html)
  }

  if (!response.ok()) {
    throw new Error(`HTTP ${response.status()} for ${url}`)
  }
  return html
}

function extractPrice($card: cheerio.Cheerio<Element>): number | null {
  if ($card.find(".price-locked").length > 0) {
    return null
  }

  const dataJpy =
    $card.find(".price-jpy[data-jpy]").attr("data-jpy") ||
    $card.find("[data-jpy]").attr("data-jpy") ||
    $card.find("[data-price]").attr("data-price")
  if (dataJpy) {
    const parsed = Number(dataJpy.replace(/,/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }

  const priceText = cleanText(
    $card
      .find(".price-jpy, .product-price, .price, .price-value")
      .first()
      .text()
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
 * Catalog-card availability signals only — no guessing.
 * Preorder badges/classes are explicit; otherwise leave unknown for product-page enrichment.
 */
function extractStatusFromCard($card: cheerio.Cheerio<Element>): ProductStatus {
  const className = $card.attr("class") ?? ""
  if (
    className.includes("preorder-card") ||
    $card.find(".preorder-badge").length > 0
  ) {
    return "preorder"
  }

  const stockText = cleanText($card.find(".stock-tag").first().text()).toLowerCase()
  if (stockText.includes("sold out") || stockText.includes("out of stock")) {
    return "soldout"
  }
  if (stockText === "in stock") {
    return "instock"
  }

  return "unknown"
}

/** Map schema.org Offer availability URLs to our status enum. */
function statusFromSchemaAvailability(value: string): ProductStatus {
  const normalized = value.toLowerCase()
  if (normalized.includes("preorder")) return "preorder"
  if (normalized.includes("instock")) return "instock"
  if (
    normalized.includes("soldout") ||
    normalized.includes("outofstock") ||
    normalized.includes("discontinued")
  ) {
    return "soldout"
  }
  return "unknown"
}

/** Walk JSON-LD (including @graph) and collect Offer.availability strings. */
function collectSchemaAvailabilities(data: unknown): string[] {
  const found: string[] = []

  function walk(node: unknown): void {
    if (!node) return
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (typeof node !== "object") return

    const record = node as Record<string, unknown>
    if ("@graph" in record) walk(record["@graph"])

    const offers = record.offers
    const offerList = Array.isArray(offers)
      ? offers
      : offers && typeof offers === "object"
        ? [offers]
        : []

    for (const offer of offerList) {
      if (!offer || typeof offer !== "object") continue
      const availability = (offer as Record<string, unknown>).availability
      if (typeof availability === "string") found.push(availability)
    }

    if (typeof record.availability === "string") {
      found.push(record.availability)
    }
  }

  walk(data)
  return found
}

/**
 * Parse explicit availability from a SORA product detail page.
 * Prefers JSON-LD schema.org/availability (do not guess from ambiguous UI).
 */
function extractStatusFromProductPage(html: string): ProductStatus {
  const $ = cheerio.load(html)

  const schemaBlocks: string[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html()
    if (raw) schemaBlocks.push(raw)
  })

  for (const block of schemaBlocks) {
    try {
      const data = JSON.parse(block) as unknown
      for (const availability of collectSchemaAvailabilities(data)) {
        const status = statusFromSchemaAvailability(availability)
        if (status !== "unknown") return status
      }
    } catch {
      // ignore invalid JSON-LD
    }
  }

  // Schema missing: only trust explicit product-level markers.
  // Do not use bare "In Stock" — SORA also shows it on preorder pages.
  if ($(".preorder-badge").length > 0) return "preorder"

  const stockTag = cleanText($(".stock-tag").first().text()).toLowerCase()
  if (stockTag.includes("sold out") || stockTag.includes("out of stock")) {
    return "soldout"
  }

  return "unknown"
}

async function fetchProductPage(
  api: APIRequestContext,
  id: string
): Promise<string> {
  const url = `${BASE_URL}/product/${id}`
  const response = await api.get(url, {
    timeout: 30_000,
    headers: { Referer: BASE_URL },
  })
  if (!response.ok()) {
    throw new Error(`HTTP ${response.status()} for ${url}`)
  }
  return response.text()
}

/**
 * Enrich unknown statuses via product detail pages.
 * Explicit catalog preorder/soldout/instock values are kept as-is.
 */
async function enrichAvailabilityStatuses(
  api: APIRequestContext,
  products: ScrapedProduct[]
): Promise<ScrapedProduct[]> {
  const enriched: ScrapedProduct[] = []

  for (const product of products) {
    if (product.status !== "unknown") {
      enriched.push(product)
      continue
    }

    try {
      const html = await fetchProductPage(api, product.id)
      const status = extractStatusFromProductPage(html)
      enriched.push({ ...product, status })
      console.log(`  Status ${product.id}: ${status}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`  Status ${product.id}: unknown (${message})`)
      enriched.push(product)
    }

    await delay(DOWNLOAD_DELAY_MS)
  }

  return enriched
}

/**
 * Parse product cards from a catalog HTML page.
 * Category comes from the CATALOGS config so new games only need an array entry.
 */
function parseProducts(html: string, category: string): ScrapedProduct[] {
  const $ = cheerio.load(html)
  const products: ScrapedProduct[] = []
  const seen = new Set<string>()

  // Authenticated HTML nests .product-card inside <a.product-card-link>.
  // Unauthenticated/htmlparser2 may hoist the card and leave the link as a sibling.
  $(".product-card").each((_, card) => {
    const $card = $(card)
    const href =
      $card.closest("a.product-card-link").attr("href") ??
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
      wholesaleJpy: extractPrice($card),
      status: extractStatusFromCard($card),
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
  api: APIRequestContext,
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
      html = await fetchCatalog(api, catalog.slug, page)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  Failed to fetch page ${page}: ${message}`)
      break
    }

    if (html.includes("price-locked") && page === 1) {
      console.warn(
        "  Warning: catalog still shows locked prices — session may have expired"
      )
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

    const priced = pageProducts.filter((p) => p.wholesaleJpy !== null).length
    console.log(
      `  Page ${page}: ${pageProducts.length} products (${newCount} new, ${priced} priced)`
    )

    if (newCount === 0) {
      console.log(`  No new products on page ${page} — stopping`)
      break
    }

    // Probe page 2 when the site exposes no pagination links.
    if (knownMaxPage === null && page === 1) {
      try {
        const probeHtml = await fetchCatalog(api, catalog.slug, 2)
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
    cost: product.cost,
    price: product.price,
    url: product.url,
    status: product.status,
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
  api: APIRequestContext,
  catalog: CatalogConfig,
  usedSlugs: Set<string>
): Promise<CatalogSummary> {
  console.log(`\n=== Importing ${catalog.category} [${catalog.slug}] ===`)

  const parsed = await fetchAllProducts(api, catalog)
  console.log(`  Parsed ${parsed.length} products`)

  const pricedCount = parsed.filter((p) => p.wholesaleJpy !== null).length
  console.log(`  Wholesale JPY found: ${pricedCount}/${parsed.length}`)

  const unknownCount = parsed.filter((p) => p.status === "unknown").length
  console.log(
    `  Resolving availability (${unknownCount} unknown via product pages)…`
  )
  const withStatus = await enrichAvailabilityStatuses(api, parsed)

  const statusCounts = withStatus.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1
      return acc
    },
    {} as Record<ProductStatus, number>
  )
  console.log(`  Status counts: ${JSON.stringify(statusCounts)}`)

  const products = applyImageSlugs(withStatus, usedSlugs)

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

  console.log("=== Authenticating with SORA ===")
  const api = await createSoraRequest()

  const summaries: CatalogSummary[] = []
  const usedSlugs = new Set<string>()

  try {
    for (const catalog of CATALOGS) {
      try {
        const summary = await importCatalog(api, catalog, usedSlugs)
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
  } finally {
    await api.dispose()
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
