# Project

## Summary

Swift TCG is a premium headless ecommerce storefront for authentic Japanese trading card imports. The storefront is built with Next.js, TypeScript, Tailwind, and shadcn/ui, with Shopify as the commerce backend and Vercel for deployment.

## Goals

- Launch a premium, minimal storefront that matches the brand
- Ship Japan's newest TCG releases with clear product data and fast UX
- Keep architecture clean: thin pages, reusable components, centralized commerce logic

## Current Status

Foundation work is underway. The Next.js app, Tailwind v4 styling, and shadcn/ui primitives are in place. Early homepage shell pieces (announcement bar, navbar, hero) have been started.

## Roadmap

### Completed

- [x] Initialize Next.js + TypeScript project
- [x] Configure Tailwind CSS v4
- [x] Set up shadcn/ui and base UI primitives
- [x] Establish folder structure (`app/`, `components/`, `lib/`)
- [x] Begin homepage shell (AnnouncementBar, Navbar, Hero)
- [x] Create project documentation (`docs/`)

### In Progress

- [ ] Finalize homepage composition and visual system
- [ ] Align typography, color tokens, and motion with brand guidelines
- [ ] Refine layout components for desktop and mobile

### Upcoming

#### Commerce foundation

- [ ] Connect Shopify Storefront API (headless)
- [ ] Add `lib/` Shopify client, queries, and product mappers
- [ ] Build product listing and product detail pages
- [ ] Implement cart and checkout handoff

#### Catalog experience

- [ ] Newest releases collection
- [ ] Preorder flow and availability messaging
- [ ] Product media, variants, and sealed-condition clarity
- [ ] Search and filtering

#### Trust & operations

- [ ] Shipping, authenticity, and FAQ content pages
- [ ] Order confirmation and customer account surfaces (as needed)
- [ ] Analytics and basic conversion tracking
- [ ] Performance and SEO pass (metadata, OG images, Core Web Vitals)

#### Launch

- [ ] Staging review against brand and design docs
- [ ] Production deploy on Vercel
- [ ] Soft launch with limited catalog
- [ ] Public launch

## Success Criteria

- Homepage and product pages feel premium, minimal, and trustworthy
- No Shopify fetching inside UI components
- Collectors can discover newest Japanese releases and purchase with confidence
- Storefront performance is fast on both desktop and mobile

## Related Docs

- [BRAND.md](./BRAND.md) — positioning, values, voice
- [DESIGN.md](./DESIGN.md) — visual system and UI principles
- [ARCHITECTURE.md](./ARCHITECTURE.md) — stack, structure, and engineering rules
