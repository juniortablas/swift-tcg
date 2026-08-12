/**
 * Shared Customer Account login entrypoints.
 *
 * All storefront "sign in" CTAs (Navbar Login, Wishlist, Notify Me, account
 * soft-gates) must go through `/account/login`, which runs the existing
 * PKCE OAuth in `beginCustomerLogin`. Do not build Shopify authorize URLs
 * in the browser — that causes redirect_uri mismatches.
 */

/**
 * Relative href for the existing OAuth start route.
 * `returnTo` is the post-login path (product PDP, /account, etc.).
 */
export function getCustomerLoginHref(returnTo: string = "/account"): string {
  const path = sanitizeReturnTo(returnTo)
  const params = new URLSearchParams()
  params.set("return_to", path)
  return `/account/login?${params.toString()}`
}

/**
 * Full-page navigate into the shared `/account/login` OAuth flow.
 * Optionally stash a pending post-login action in sessionStorage
 * (wishlist add / back-in-stock subscribe).
 */
export function redirectToCustomerLogin(options?: {
  returnTo?: string
  pending?: { key: string; value: string }
}): void {
  if (typeof window === "undefined") return

  if (options?.pending?.key && options.pending.value) {
    try {
      window.sessionStorage.setItem(options.pending.key, options.pending.value)
    } catch {
      // Ignore private-mode / quota failures.
    }
  }

  const returnTo =
    options?.returnTo ??
    `${window.location.pathname}${window.location.search}`

  // Hard navigation so the Route Handler runs (same as a Login link click).
  window.location.assign(getCustomerLoginHref(returnTo))
}

function sanitizeReturnTo(returnTo: string): string {
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return "/account"
  if (returnTo.startsWith("/account/login")) return "/account"
  if (returnTo.startsWith("/account/authorize")) return "/account"
  if (returnTo.startsWith("/account/logout")) return "/account"
  return returnTo
}
