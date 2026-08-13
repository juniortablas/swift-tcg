# Architecture

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui |
| Commerce | Shopify (Headless Storefront + Admin sync) |
| Hosting | Vercel |
| Observability | Sentry (`@sentry/nextjs`) — errors, traces, replay |

## Folder Conventions

```
app/           → Pages, layouts, and route handlers
components/    → Reusable UI
lib/           → Business logic, Shopify clients, helpers
types/         → Shared TypeScript types
data/          → Offline importer dumps (not storefront runtime)
scripts/       → Import / sync / auth tooling
public/        → Static assets
docs/          → Project documentation
```

### Rules

- **Pages belong in `app/`** — route composition only; keep pages thin.
- **Reusable UI belongs in `components/`** — presentational and interaction-focused.
- **Business logic belongs in `lib/`** — data fetching, transforms, commerce rules, utilities.
- **Shared types belong in `types/`** — domain and API shapes used across the app.
- **Static assets belong in `public/`** — images, icons, and other static files.
- **Never fetch Shopify directly inside UI components.** Components receive data via props, server components in `app/`, or dedicated `lib/` modules.
- **Components should stay under 200 lines whenever practical.** Prefer composition over large files.

## Data Flow

Shopify is the **single source of truth** for storefront product data,
informational content (Online Store pages, shop policies, contact/social
metafields), and marketing assets (Storefront Hero / Visual metaobjects).
There is no JSON catalog fallback at runtime. Marketing images fall back to
local `/public` assets only when a metaobject or file is missing
(see `docs/STOREFRONT_CMS.md`).

```
Shopify Admin API          Shopify Storefront API
 (scripts + sync)           (lib/shopify loaders)
        ↓                            ↓
  product create/update      map → @/types/product
  collection assignment      metaobjects → heroes / visuals
  metaobject CMS entries             ↓
                           app/ (server pages / API routes)
                                     ↓
                              components/ (UI)
```

| Concern | Where it lives |
| --- | --- |
| Storefront reads (products, collections, search, homepage rails, pages, policies) | `lib/shopify/` → `app/` |
| Marketing heroes / category & language card art | `lib/shopify/storefrontCms.ts` (Metaobjects + local fallbacks) |
| Cart create / lines / checkout URL | `lib/shopify/cart.ts` via `app/api/cart` |
| Shop Pay accelerated checkout | Official `<shop-pay-button>` via `components/checkout/ShopPayButton` (PDP + cart). Regular Checkout still uses `checkoutUrl`. |
| Presentation helpers (filters, specs, CTAs, collection chrome) | `lib/catalog/` (operates on `Product`, does not load catalog data) |
| Import from SORA + Admin sync | `scripts/import-sora.ts` + `lib/shopify/sync.ts` |
| Offline JSON dumps under `data/` | Importer artifact only — never read by the storefront |

### Why this split

- UI stays testable and reusable without commerce credentials
- Shopify API details stay centralized and easier to change
- Pages orchestrate; components render; `lib/` owns domain logic
- Shared types in `types/` keep commerce boundaries explicit

## Routes

| Route | Loader |
| --- | --- |
| `/` | `getHomepagePageData` (Homepage metaobject orchestration → nested refs; legacy per-type fallbacks when no entry) |
| `/[game]`, `/[game]/[language]` | `loadTcgCollectionPage` |
| `/preorders`, `/preorders/[game]`, `/preorders/[game]/[language]` | `loadMerchCollectionPage({ merchKey: "preorders" })` |
| `/new-releases`, … | `loadMerchCollectionPage({ merchKey: "new-releases" })` → Shopify handle `new-arrivals` |
| `/products/[slug]` | `getShopifyProductByHandle` + `getShopifyRelatedProducts` |
| `/pages/[handle]` | `getShopifyPageByHandle` (About, Contact, FAQ, Preorder Policy, …) |
| `/policies/[handle]` | `getShopifyPolicyByHandle` (Shipping, Refund, Privacy, Terms) |
| `/account`, `/account/orders`, `/account/wishlist`, `/account/notifications`, `/account/reviews`, `/account/addresses`, `/account/profile` | Customer Account API (New Customer Accounts OAuth) |
| `/account/login`, `/account/authorize`, `/account/logout` | Shopify Customer Account OAuth (PKCE) |
| `/api/search` | `searchShopifyProducts` |
| `/api/newsletter` | Shopify Admin `customerCreate` / email marketing consent |
| `/api/cart` | Shopify cart mutations (+ `attachCustomer` for buyer identity) |
| `/api/wishlist` | Customer wishlist metafield (CA API, Admin fallback) |
| `/api/back-in-stock` | Back-in-stock subscriptions (customer + product metafields) |
| `/api/cron/back-in-stock` | Inventory poll → branded Resend email (Vercel Cron) |
| `/api/reviews` | Product reviews (metaobjects + aggregates) |
| `/api/reviews/[id]` | Helpful vote / edit / delete pending review |
| `/api/webhooks/reviews` | Metaobject change → recompute product aggregates |
| `/api/webhooks/cache` | Catalog/CMS/shop + orders/refunds → `revalidateTag` (see Cache invalidation webhooks) |
| `/api/account/session` | Client session probe (logged-in) for cacheable chrome |
| `/api/cron/reviews` | Hourly aggregate sync after Admin moderation |

## Component Organization

```
components/
  layout/      → AnnouncementBar, Navbar, Footer, StoreChrome
  home/        → Hero and homepage sections
  catalog/     → Collection browse, product cards, quick view
  product/     → PDP gallery, purchase panel, details
  reviews/     → Stars, summary, cards, modal, gallery, filters
  content/     → Shopify pages / policies (rich HTML, contact, FAQ)
  cart/        → Cart drawer, line items, mixed-cart dialog
  checkout/    → Official Shop Pay accelerated checkout button
  search/      → Search dialog
  ui/          → shadcn primitives and shared controls
```

## Server vs Client

- Default to **Server Components** in `app/` and most `components/`
- Add `"use client"` only for interactivity (menus, drawers, forms, local state)
- Keep Shopify access on the server side whenever possible
- Cart mutations go through `app/api/cart` so private Storefront tokens stay server-side
- Shop Pay uses Shopify's official web component (Checkout Links). Load its CDN script only on PDP/cart when the button mounts. Do not recreate the Shop Pay button.

## Observability

Sentry (`@sentry/nextjs`) captures client, server, edge, Route Handler, Server Component, webhook, and cron failures. It initializes only when a DSN is set. Helpers live in `lib/observability/`. See [SENTRY.md](./SENTRY.md).

## Shopify Integration Guidelines

- Place Storefront API clients and query functions in `lib/shopify/`
- Map Shopify responses into `@/types/product` in `mappers.ts` before UI consumption
- Do not hardcode secrets in components; use environment variables (see `.env.local.example`)
- Prefer typed helpers over ad-hoc `fetch` calls scattered across the tree
- UI components must never call Shopify APIs directly
- Admin credentials (`SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET`) are for importer sync only

### Storefront inventory scope

`quantityAvailable` requires `unauthenticated_read_product_inventory`.
That permission is enabled on the Headless channel and is used by the cart
engine for bag quantity ceilings. Overselling is also blocked by Shopify cart
mutation errors.

If `quantityAvailable` ever returns `ACCESS_DENIED` again, re-check Headless
permissions and rotate the private Storefront token if needed
(see `.env.local.example`).

### Cache invalidation webhooks

`POST /api/webhooks/cache` is the single HTTPS receiver (`npm run setup:cache-webhooks`).

`SHOPIFY_APP_URL` (`https://www.swifttcg.com`) is the customer-facing origin for
SEO, canonicals, OAuth, Customer Accounts, robots.txt, sitemap, JSON-LD, and
storefront links. Catalog webhooks keep using that origin:

| Topics | Callback |
| --- | --- |
| Products, collections, inventory, CMS metaobjects, shop/update | `{SHOPIFY_APP_URL}/api/webhooks/cache` |
| `ORDERS_CREATE`, `ORDERS_UPDATED`, `ORDERS_CANCELLED`, `REFUNDS_CREATE` | `{SHOPIFY_WEBHOOK_ORIGIN}/api/webhooks/cache` — also increment/decrement `custom.current_weekly_reservations` (idempotent via webhook IDs) |

Shopify will not deliver order or refund webhooks to the shop’s myshopify
domain or any custom domain attached to the store. `www.swifttcg.com` is that
storefront domain, so it cannot be the Orders/Refund callback.

`SHOPIFY_WEBHOOK_ORIGIN` defaults to unset. When it is missing, setup skips
the four restricted topics, prints why, and still registers every other
webhook. Set it to an HTTPS host that is **not** listed under Shopify Admin →
Settings → Domains (same Vercel app, different hostname). Do not point it at
`SHOPIFY_APP_URL`.

### Weekly restock reservation counter

Outstanding paid reservations live on the product metafield
`custom.current_weekly_reservations`. Remaining spots are
`custom.weekly_restock_limit − custom.current_weekly_reservations`.
Catalog, PDP, and cart read those metafields once with the product.
The storefront never searches Shopify orders at runtime.
Cart quantity updates reuse a 60s cart/session snapshot of remaining
spots and never re-read metafields or call Admin GraphQL. Remaining is
refreshed when the cart loads, a reservation line is added, checkout
starts, or the snapshot expires.

Order/refund webhooks update the counter (clamped to `0…limit`) and skip
duplicate Shopify deliveries via webhook/event IDs. If the counter cannot be
read, reservation SKUs fail closed (Sold Out) and Sentry captures the error.

One-time backfill from existing orders:

```
npm run sync:weekly-reservations
```

## Styling Guidelines

- Use Tailwind utility classes and shared tokens
- Prefer shadcn/ui for accessible primitives (`Button`, etc.)
- Co-locate visual decisions with components; keep domain logic out of class strings
- Follow `docs/DESIGN.md` for visual direction and composition rules

## Quality Checklist

Before merging a feature:

- [ ] No Shopify fetches inside UI components
- [ ] No new JSON catalog loaders for storefront data
- [ ] New logic has a clear home in `lib/` when it is not purely presentational
- [ ] Shared types live in `types/` when reused across boundaries
- [ ] Components remain under ~200 lines whenever practical
- [ ] Prefer composition over monolithic files
- [ ] Pages compose sections; sections do not own global data strategy
