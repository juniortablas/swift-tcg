/**
 * Shopify module barrel
 *
 * Re-exports Storefront API client, queries, mutations, and shared types
 * so the app can import from `@/lib/shopify` once the integration lands.
 */

export * from "./client";
export * from "./queries";
export * from "./mutations";
export * from "./types";
