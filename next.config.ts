import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

import {
  getSentryReleaseName,
  SENTRY_TUNNEL_ROUTE,
} from "./lib/observability/config"

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/s/files/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim()
const sentryOrg = process.env.SENTRY_ORG?.trim()
const sentryProject = process.env.SENTRY_PROJECT?.trim()

export default withSentryConfig(nextConfig, {
  org: sentryOrg,
  project: sentryProject,
  authToken: sentryAuthToken,

  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: SENTRY_TUNNEL_ROUTE,

  sourcemaps: {
    disable: !sentryAuthToken,
    deleteSourcemapsAfterUpload: true,
  },

  release: {
    name: getSentryReleaseName(),
    create: Boolean(sentryAuthToken && sentryOrg && sentryProject),
  },

  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },

  _experimental: {
    vercelCronsMonitoring: true,
  },

  errorHandler: (error) => {
    console.warn(
      "[sentry] Source map upload skipped or failed. The production build continues.",
      error
    )
  },
})
