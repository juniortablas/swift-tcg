/**
 * SORA CardShop Playwright auth helpers.
 *
 * Manages an authenticated browser session for wholesale price scraping.
 * Credentials are never stored — only Playwright storage state (cookies).
 */

import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium, request, type APIRequestContext, type Page } from "playwright"

export const SORA_BASE_URL = "https://sora-cardshop.com"
export const SORA_LOGIN_URL = `${SORA_BASE_URL}/login`
export const SORA_AUTH_DIR = path.join(process.cwd(), "playwright", ".auth")
export const SORA_AUTH_STATE_PATH = path.join(SORA_AUTH_DIR, "sora.json")

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const EMPTY_STORAGE_STATE = {
  cookies: [] as unknown[],
  origins: [] as unknown[],
}

const LOGIN_TIMEOUT_MS = 15 * 60 * 1000

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/** Ensure the auth directory + empty storage file exist (no credentials). */
export async function ensureAuthFiles(): Promise<void> {
  await mkdir(SORA_AUTH_DIR, { recursive: true })
  if (!(await fileExists(SORA_AUTH_STATE_PATH))) {
    await writeFile(
      SORA_AUTH_STATE_PATH,
      JSON.stringify(EMPTY_STORAGE_STATE, null, 2) + "\n",
      "utf8"
    )
  }
}

async function hasCookieSession(): Promise<boolean> {
  if (!(await fileExists(SORA_AUTH_STATE_PATH))) return false

  try {
    const raw = await readFile(SORA_AUTH_STATE_PATH, "utf8")
    const parsed = JSON.parse(raw) as { cookies?: unknown[] }
    return Array.isArray(parsed.cookies) && parsed.cookies.length > 0
  } catch {
    return false
  }
}

async function pageShowsWholesalePrices(page: Page): Promise<boolean> {
  if (page.url().includes("/login")) return false

  const lockedCount = await page.locator(".price-locked").count()
  const visiblePrices = await page.locator(".price-jpy[data-jpy]").count()

  return visiblePrices > 0 && lockedCount === 0
}

/**
 * Probe the catalog with the saved storage state.
 * Valid when wholesale prices are unlocked (no .price-locked).
 */
export async function isSoraSessionValid(): Promise<boolean> {
  if (!(await hasCookieSession())) return false

  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({
      storageState: SORA_AUTH_STATE_PATH,
      userAgent: USER_AGENT,
    })
    const page = await context.newPage()
    await page.goto(`${SORA_BASE_URL}/catalog/pokemon`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })

    const valid = await pageShowsWholesalePrices(page)
    await context.close()
    return valid
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`  Session check failed: ${message}`)
    return false
  } finally {
    await browser.close()
  }
}

/**
 * Open a visible browser on the SORA login page and wait for the user
 * to sign in manually. Saves cookies only — never email/password.
 */
export async function interactiveSoraLogin(): Promise<void> {
  await ensureAuthFiles()

  console.log("\n=== SORA authentication required ===")
  console.log("  A browser window will open on the login page.")
  console.log("  Sign in with your B2B account.")
  console.log("  Email and password are NEVER stored — only session cookies.")
  console.log("  Waiting until you leave the login page…\n")

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  })

  try {
    const context = await browser.newContext({ userAgent: USER_AGENT })
    const page = await context.newPage()
    await page.goto(SORA_LOGIN_URL, { waitUntil: "domcontentloaded" })

    // Manual login: user submits the form; wait until redirected away from /login.
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: LOGIN_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    })

    console.log("  Login redirect detected — verifying wholesale prices…")

    await page.goto(`${SORA_BASE_URL}/catalog/pokemon`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })

    if (!(await pageShowsWholesalePrices(page))) {
      throw new Error(
        "Login finished but wholesale prices are still locked. Check B2B access and retry."
      )
    }

    await context.storageState({ path: SORA_AUTH_STATE_PATH })
    console.log(`  Saved session → ${SORA_AUTH_STATE_PATH}`)
    console.log("  (cookies only — no email or password stored)\n")
  } finally {
    await browser.close()
  }
}

/**
 * Ensure a valid authenticated session exists.
 * Reuses playwright/.auth/sora.json when still valid; otherwise prompts login.
 */
export async function ensureSoraAuth(): Promise<void> {
  await ensureAuthFiles()

  if (await isSoraSessionValid()) {
    console.log(`  Reusing authenticated session (${SORA_AUTH_STATE_PATH})`)
    return
  }

  if (await hasCookieSession()) {
    console.log(
      "  Saved session expired or prices still locked — re-authenticating…"
    )
  }

  await interactiveSoraLogin()

  if (!(await isSoraSessionValid())) {
    throw new Error(
      "Authentication did not unlock wholesale prices. Delete playwright/.auth/sora.json and retry."
    )
  }
}

/** Authenticated HTTP client that reuses the saved Playwright storage state. */
export async function createSoraRequest(): Promise<APIRequestContext> {
  await ensureSoraAuth()
  return request.newContext({
    baseURL: SORA_BASE_URL,
    storageState: SORA_AUTH_STATE_PATH,
    userAgent: USER_AGENT,
    extraHTTPHeaders: {
      Accept: "text/html,application/xhtml+xml",
    },
  })
}
