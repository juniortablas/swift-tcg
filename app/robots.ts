import type { MetadataRoute } from "next"

import { CANONICAL_HOST, CANONICAL_ORIGIN } from "@/lib/seo"

/**
 * App Router robots → served at `/robots.txt`.
 *
 * Host + Sitemap always emit the www canonical so crawlers never see apex.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/account/", "/cart", "/cart/", "/api/", "/api"],
      },
    ],
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_HOST,
  }
}
