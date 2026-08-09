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
| `/` | `getShopifyComingSoonProducts` / `getShopifyNewestArrivals` + `getHomepageHeroSlides` / `getHomepageCategoryCards` |
| `/[game]`, `/[game]/[language]` | `loadTcgCollectionPage` |
| `/preorders`, `/preorders/[game]`, `/preorders/[game]/[language]` | `loadMerchCollectionPage({ merchKey: "preorders" })` |
| `/new-releases`, … | `loadMerchCollectionPage({ merchKey: "new-releases" })` → Shopify handle `new-arrivals` |
| `/products/[slug]` | `getShopifyProductByHandle` + `getShopifyRelatedProducts` |
| `/pages/[handle]` | `getShopifyPageByHandle` (About, Contact, FAQ, Preorder Policy, …) |
| `/policies/[handle]` | `getShopifyPolicyByHandle` (Shipping, Refund, Privacy, Terms) |
| `/account`, `/account/orders`, `/account/addresses`, `/account/profile` | Customer Account API (New Customer Accounts OAuth) |
| `/account/login`, `/account/authorize`, `/account/logout` | Shopify Customer Account OAuth (PKCE) |
| `/api/search` | `searchShopifyProducts` |
| `/api/cart` | Shopify cart mutations (+ `attachCustomer` for buyer identity) |

## Component Organization

```
components/
  layout/      → AnnouncementBar, Navbar, Footer, StoreChrome
  home/        → Hero and homepage sections
  catalog/     → Collection browse, product cards, quick view
  product/     → PDP gallery, purchase panel, details
  content/     → Shopify pages / policies (rich HTML, contact, FAQ)
  cart/        → Cart drawer, line items, mixed-cart dialog
  search/      → Search dialog
  ui/          → shadcn primitives and shared controls
```

## Server vs Client

- Default to **Server Components** in `app/` and most `components/`
- Add `"use client"` only for interactivity (menus, drawers, forms, local state)
- Keep Shopify access on the server side whenever possible
- Cart mutations go through `app/api/cart` so private Storefront tokens stay server-side

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
