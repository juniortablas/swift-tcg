# Architecture

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| UI library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui |
| Commerce | Shopify (Headless) |
| Hosting | Vercel |

## Folder Conventions

```
app/           → Pages, layouts, and route handlers
components/    → Reusable UI
lib/           → Business logic, Shopify clients, helpers
types/         → Shared TypeScript types
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

```
Shopify Admin / Storefront API
        ↓
   lib/ (clients, queries, mappers)
        ↓
   app/ (server components / route handlers)
        ↓
   components/ (UI)
```

### Why this split

- UI stays testable and reusable without commerce credentials
- Shopify API details stay centralized and easier to change
- Pages orchestrate; components render; `lib/` owns domain logic
- Shared types in `types/` keep commerce boundaries explicit

## Component Organization

Suggested structure as the storefront grows:

```
components/
  layout/      → AnnouncementBar, Navbar, Footer
  home/        → Hero and homepage sections
  product/     → Product cards, galleries, buy actions
  cart/        → Cart drawer, line items, checkout CTAs
  ui/          → shadcn primitives and shared controls
```

## Server vs Client

- Default to **Server Components** in `app/` and most `components/`
- Add `"use client"` only for interactivity (menus, drawers, forms, local state)
- Keep Shopify access on the server side whenever possible

## Shopify Integration Guidelines

- Place Storefront API clients and query functions in `lib/shopify/` (or equivalent)
- Map Shopify responses into app-friendly types in `types/` before UI consumption
- Do not hardcode secrets in components; use environment variables
- Prefer typed helpers over ad-hoc `fetch` calls scattered across the tree
- UI components must never call Shopify APIs directly

## Styling Guidelines

- Use Tailwind utility classes and shared tokens
- Prefer shadcn/ui for accessible primitives (`Button`, etc.)
- Co-locate visual decisions with components; keep domain logic out of class strings
- Follow `docs/DESIGN.md` for visual direction and composition rules

## Quality Checklist

Before merging a feature:

- [ ] No Shopify fetches inside UI components
- [ ] New logic has a clear home in `lib/` when it is not purely presentational
- [ ] Shared types live in `types/` when reused across boundaries
- [ ] Components remain under ~200 lines whenever practical
- [ ] Prefer composition over monolithic files
- [ ] Pages compose sections; sections do not own global data strategy
