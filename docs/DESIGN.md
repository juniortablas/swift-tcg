# Design

## Philosophy

Swift TCG's visual language is inspired by **Apple**, **Stripe**, **Linear**, and **Vercel**: quiet confidence, generous whitespace, sharp typography, and product-first composition.

Design should feel premium without decoration for its own sake. Every surface earns its place. Never use marketing hype in UI copy or visual treatment.

## Principles

1. **One composition** — The first viewport reads as a single idea, not a dashboard of promotions.
2. **Brand first** — The brand or product name is a hero-level signal, not just nav text.
3. **Restraint** — Prefer fewer elements with stronger hierarchy over dense marketing blocks.
4. **Product as the visual** — Real sealed product, atmosphere, and context — not abstract decoration as the main idea.
5. **Motion with purpose** — Use subtle motion for presence and hierarchy, never noise.

## Visual Direction

### Atmosphere

- Clean light surfaces with subtle depth (gradients, soft patterns, or product photography)
- Avoid flat single-color pages that feel unfinished
- Avoid dark-mode-first defaults unless a dedicated experience requires it

### Typography

- Expressive, purposeful type — not default system stacks (Inter, Roboto, Arial)
- Strong display hierarchy for product and brand
- Body copy stays readable, calm, and short

### Color

Define a clear token set in CSS variables. Keep the palette tight.

**Avoid AI-default looks:**

- Purple-on-white / purple-to-indigo gradient themes
- Warm cream + terracotta + high-contrast serif clichés
- Broadsheet / dense newspaper layouts
- Glow effects, multi-layer shadows, and rounded-full pill clusters as defaults

### Layout

- Full-bleed hero on landing and promotional surfaces
- No inset hero cards, floating media tiles, or collage heroes unless the design system explicitly requires them
- Cards only when they contain a user interaction; otherwise prefer open layout

## Hero Budget

The first viewport should usually contain only:

- Brand
- One headline
- One short supporting sentence
- One CTA group
- One dominant image

Do **not** place stats, schedules, address blocks, promo stickers, floating badges, or secondary marketing content in the first viewport.

## Section Rules

- One job per section: one purpose, one headline, and usually one short supporting sentence
- Reduce clutter: avoid pill clusters, stat strips, icon rows, and boxed promo stacks
- Imagery should show the product, place, atmosphere, or context

## Component Guidance

| Pattern | Guidance |
| --- | --- |
| Buttons | Clear primary / secondary hierarchy; no competing CTAs |
| Navigation | Minimal, scannable, professional |
| Product media | Edge-to-edge or dominant plane; high-quality photography |
| Announcements | Short, factual, dismissible when appropriate |
| Forms / checkout | Stripe-like clarity: labels, states, and errors are obvious |
| Trust / social proof | Factual and quiet — never hype-driven |

## Accessibility

- Maintain sufficient contrast
- Support keyboard navigation
- Prefer semantic HTML over decorative wrappers
- Motion should respect `prefers-reduced-motion`

## Quality Bar

A screen is ready when it feels intentional at a glance: clear hierarchy, calm density, and an obvious next action — with nothing left to remove.
