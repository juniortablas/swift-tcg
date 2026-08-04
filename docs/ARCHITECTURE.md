# Architecture

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI primitives | shadcn/ui |
| Commerce | Shopify (Headless) |
| Hosting | Vercel |

## Folder Conventions

```
app/           → Pages, layouts, and route handlers
components/    → Reusable UI (layout, home, product, shared)
lib/           → Business logic, Shopify clients, helpers, types
docs/          → Project documentation
```

### Rules

- **Pages live in `app/`** — route composition only; keep pages thin.
- **Reusable UI lives in `components/`** — presentational and interaction-focused.
- **Business logic lives in `lib/`** — data fetching, transforms, commerce rules, utilities.
- **Never fetch Shopify directly inside UI components.** Components receive data via props, server components in `app/`, or dedicated `lib/` modules.
- **Keep components small and reusable.** Prefer composition over large monolithic files.

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
- Map Shopify responses into app-friendly types before UI consumption
- Do not hardcode secrets in components; use environment variables
- Prefer typed helpers over ad-hoc `fetch` calls scattered across the tree

## Styling Guidelines

- Use Tailwind utility classes and shared tokens
- Prefer shadcn/ui for accessible primitives (`Button`, etc.)
- Co-locate visual decisions with components; keep domain logic out of class strings

## Quality Checklist

Before merging a feature:

- [ ] No Shopify fetches inside UI components
- [ ] New logic has a clear home in `lib/` when it is not purely presentational
- [ ] Components remain small enough to understand in one screen
- [ ] Types cover commerce data boundaries
- [ ] Pages compose sections; sections do not own global data strategy
