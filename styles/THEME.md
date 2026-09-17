# Theme

Swift TCG’s design tokens for a **premium, minimal, and spacious** storefront.

Inspired by **Apple** (restraint, material clarity), **Linear** (precision, calm density), **Stripe** (trust, readable hierarchy), and **Vercel** (whitespace, sharp type).

Canonical TypeScript exports live in [`lib/design.ts`](../lib/design.ts). Prefer those constants in application code; keep this file as the human-readable source of truth.

---

## Philosophy

- Quiet confidence over decoration
- Generous whitespace as a feature
- Product and brand lead; chrome stays out of the way
- One clear action per surface
- Motion for presence and hierarchy — never noise

---

## Color palette

Tight neutral system with a single brand accent. Avoid purple gradients, cream/terracotta clichés, and glow-heavy treatments.

| Token | Hex | Usage |
| --- | --- | --- |
| `neutral.0` | `#FFFFFF` | Page background, elevated surfaces |
| `neutral.50` | `#FAFAFA` | Subtle section / media placeholders |
| `neutral.100` | `#F5F5F5` | Soft fills, muted chips |
| `neutral.200` | `#E5E5E5` | Dividers, input borders |
| `neutral.300` | `#D4D4D4` | Stronger borders, disabled edges |
| `neutral.400` | `#A3A3A3` | Placeholder text |
| `neutral.500` | `#737373` | Secondary body / captions |
| `neutral.600` | `#525252` | Supporting copy |
| `neutral.700` | `#404040` | Emphasized secondary text |
| `neutral.800` | `#262626` | Near-primary text on light |
| `neutral.900` | `#171717` | Primary text |
| `neutral.950` | `#0A0A0A` | Highest-contrast ink / primary buttons |
| `brand.50` | `#EEF2FF` | Soft brand wash |
| `brand.100` | `#E0E7FF` | Brand tint backgrounds |
| `brand.500` | `#6366F1` | Brand highlight (icons, focus accents) |
| `brand.600` | `#4F46E5` | Primary CTA, links, key accents |
| `brand.700` | `#4338CA` | CTA hover / pressed |
| `semantic.success` | `#16A34A` | Positive states |
| `semantic.warning` | `#D97706` | Caution, low stock |
| `semantic.error` | `#DC2626` | Errors, destructive actions |
| `semantic.info` | `#2563EB` | Informational callouts |

**Alpha helpers (on light surfaces):**

| Token | Value | Usage |
| --- | --- | --- |
| `alpha.ink05` | `rgba(0, 0, 0, 0.05)` | Soft hover fills |
| `alpha.ink10` | `rgba(0, 0, 0, 0.10)` | Borders, hairlines |
| `alpha.ink40` | `rgba(0, 0, 0, 0.40)` | Muted labels |
| `alpha.ink60` | `rgba(0, 0, 0, 0.60)` | Secondary body |

---

## Typography scale

Use a purposeful sans (e.g. Geist / system geometric) — not Inter, Roboto, or Arial as the brand voice. Tight tracking on display; relaxed line-height on body.

| Token | Size | Line height | Weight | Letter spacing | Usage |
| --- | --- | --- | --- | --- | --- |
| `display` | `3.75rem` (60px) | `1.1` | `600` | `-0.02em` | Hero brand / primary headline |
| `h1` | `3rem` (48px) | `1.15` | `600` | `-0.02em` | Page titles |
| `h2` | `2.25rem` (36px) | `1.2` | `600` | `-0.015em` | Section titles |
| `h3` | `1.5rem` (24px) | `1.3` | `600` | `-0.01em` | Subsections, product names (lg) |
| `h4` | `1.25rem` (20px) | `1.35` | `600` | `-0.01em` | Card titles, dense headers |
| `body.lg` | `1.125rem` (18px) | `1.65` | `400` | `0` | Lead paragraphs |
| `body.md` | `1rem` (16px) | `1.6` | `400` | `0` | Default body |
| `body.sm` | `0.875rem` (14px) | `1.5` | `400` | `0` | Secondary copy, meta |
| `caption` | `0.75rem` (12px) | `1.4` | `500` | `0.02em` | Labels, eyebrows, fine print |
| `mono` | `0.875rem` (14px) | `1.5` | `400` | `0` | SKUs, codes, tabular data |

---

## Border radius

Soft but restrained — closer to Apple / Stripe than fully rounded pills.

| Token | Value | Usage |
| --- | --- | --- |
| `none` | `0` | Full-bleed media, sharp dividers |
| `sm` | `0.375rem` (6px) | Inputs, small controls |
| `md` | `0.5rem` (8px) | Buttons, chips |
| `lg` | `0.75rem` (12px) | Cards, dialogs |
| `xl` | `1rem` (16px) | Large media frames |
| `2xl` | `1.25rem` (20px) | Hero media, featured panels |
| `full` | `9999px` | Avatars only — avoid default pill clusters |

---

## Shadows

Single-layer, low-contrast elevation. Prefer border + light shadow over multi-layer glow.

| Token | Value | Usage |
| --- | --- | --- |
| `none` | `none` | Flat surfaces |
| `xs` | `0 1px 2px rgba(0, 0, 0, 0.04)` | Subtle lift on controls |
| `sm` | `0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)` | Cards at rest |
| `md` | `0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)` | Hover / focused cards |
| `lg` | `0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)` | Modals, popovers |
| `focus` | `0 0 0 3px rgba(79, 70, 229, 0.25)` | Focus rings (brand-tinted) |

---

## Container widths

Centered content with generous horizontal padding. Prefer `max-w-*` + `mx-auto` + `px-6`.

| Token | Max width | Usage |
| --- | --- | --- |
| `sm` | `40rem` (640px) | Narrow forms, focused reading |
| `md` | `48rem` (768px) | Article / long-form |
| `lg` | `64rem` (1024px) | Standard content |
| `xl` | `72rem` (1152px) | Default storefront sections (`max-w-6xl`) |
| `2xl` | `80rem` (1280px) | Wide product grids |
| `full` | `100%` | Full-bleed heroes and media |

**Horizontal padding:** `1.5rem` (24px) mobile → keep at least `1.5rem` on desktop; section vertical rhythm favors `4rem`–`8rem`.

---

## Button styles

Clear primary / secondary hierarchy. One dominant CTA per view.

| Variant | Background | Text | Border | Notes |
| --- | --- | --- | --- | --- |
| `primary` | `brand.600` | `#FFFFFF` | none | Default shop / commit action; hover `brand.700` |
| `secondary` | `neutral.950` | `#FFFFFF` | none | High-contrast alternate primary |
| `outline` | transparent | `neutral.900` | `alpha.ink10` | Secondary actions; hover `alpha.ink05` |
| `ghost` | transparent | `neutral.900` | none | Tertiary; hover `alpha.ink05` |
| `destructive` | `semantic.error` | `#FFFFFF` | none | Irreversible actions only |

**Sizes**

| Size | Height | Padding X | Type |
| --- | --- | --- | --- |
| `sm` | `2rem` (32px) | `0.75rem` | `body.sm` |
| `md` | `2.5rem` (40px) | `1rem` | `body.md` |
| `lg` | `2.75rem` (44px) | `1.5rem` | `body.md` |

Radius: `md`. Transition: `animation.fast` on background / border.

---

## Card styles

Cards are **interaction containers only** (product tiles, selectable options). Do not wrap static marketing content in cards.

| Property | Value |
| --- | --- |
| Background | `neutral.0` |
| Border | `1px solid` `alpha.ink10` (or `neutral.200`) |
| Radius | `lg`–`xl` |
| Shadow | `sm` at rest → `md` on hover |
| Padding | `spacing[4]`–`spacing[6]` |
| Gap | `spacing[3]`–`spacing[4]` |

Media inside cards: prefer edge-flush imagery with content padded below — avoid floating inset thumbnails unless the layout requires it.

---

## Animation durations

Respect `prefers-reduced-motion: reduce` (instant or opacity-only).

| Token | Duration | Easing | Usage |
| --- | --- | --- | --- |
| `instant` | `0ms` | — | Reduced motion / hard swaps |
| `fast` | `150ms` | `ease-out` | Hovers, button feedback |
| `normal` | `250ms` | `ease-out` | Panels, fades, disclosure |
| `slow` | `400ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Page enters, hero presence |
| `slower` | `600ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Large scenic transitions |

**Easing tokens**

| Token | Value | Feel |
| --- | --- | --- |
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` | Linear / Vercel-like |
| `emphasized` | `cubic-bezier(0.16, 1, 0.3, 1)` | Soft overshoot settle |
| `exit` | `cubic-bezier(0.4, 0, 1, 1)` | Quick dismiss |

Ship 2–3 intentional motions per visually led page (e.g. hero fade-up, CTA hover, product reveal) — not continuous ambient animation.

---

## Spacing scale

4px base unit. Prefer larger steps between sections for a spacious feel.

| Token | Value | Common use |
| --- | --- | --- |
| `0` | `0` | Reset |
| `1` | `0.25rem` (4px) | Hairline gaps |
| `2` | `0.5rem` (8px) | Tight related items |
| `3` | `0.75rem` (12px) | Button groups, chip gaps |
| `4` | `1rem` (16px) | Default component padding |
| `5` | `1.25rem` (20px) | Compact section gaps |
| `6` | `1.5rem` (24px) | Container padding, stack gaps |
| `8` | `2rem` (32px) | Card / block separation |
| `10` | `2.5rem` (40px) | Medium section breathing room |
| `12` | `3rem` (48px) | Large stack gaps |
| `16` | `4rem` (64px) | Section padding (compact) |
| `20` | `5rem` (80px) | Section padding (default) |
| `24` | `6rem` (96px) | Section padding (spacious) |
| `32` | `8rem` (128px) | Hero / landmark vertical rhythm |

---

## Quality bar

A surface is on-theme when it feels intentional at a glance: clear hierarchy, calm density, obvious next action, and nothing left to remove.
