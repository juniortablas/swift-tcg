import type { MetadataRoute } from "next"

import { absoluteUrl, getSiteOrigin } from "@/lib/seo"

/**
 * App Router robots → served at `/robots.txt`.
 * Sitemap URL must match the browsable origin (SHOPIFY_APP_URL / site URL).
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin()
  const host = new URL(origin).host

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/account/", "/cart", "/cart/", "/api/", "/api"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host,
  }
}
