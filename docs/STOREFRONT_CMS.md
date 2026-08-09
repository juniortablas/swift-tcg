# Storefront CMS (Shopify Metaobjects)

Marketing heroes, category cards, language cards, and promotional artwork are
managed in Shopify as Metaobjects. The Next.js storefront reads them at runtime
and falls back to local `/public` assets when an entry or image is missing.

Product **Release Date** (`custom.release_date`) is a Product metafield created
by the same setup script — see [§8](#8-product-release-date-metafield).

After this setup, changing a hero banner or category image never requires a
code change or redeploy.

## One-command setup

```bash
npm run setup:cms
```

This runs `scripts/setup-storefront-cms.ts` against the Admin GraphQL API and:

1. Creates (or verifies) the `storefront_hero` and `storefront_visual` definitions
2. Creates (or verifies) the Product metafield `custom.release_date` (Date)
3. Seeds hero + visual entries by stable `key` (idempotent — no duplicates)
4. Uploads matching `/public` images to Shopify Files and attaches them when missing
5. Verifies the Storefront API returns Shopify data for sample keys

Dry-run:

```bash
npx tsx scripts/setup-storefront-cms.ts --dry-run
```

Required Admin scopes (Dev Dashboard app → reinstall/update on store):

- `read_metaobject_definitions` / `write_metaobject_definitions`
- `read_metaobjects` / `write_metaobjects`
- `write_files` / `read_files`
- `write_products` (Product metafield definitions)

Required Storefront permission (Headless channel):

- `unauthenticated_read_metaobjects`

Helpers:

```ts
import { getStorefrontHero, getStorefrontVisual } from "@/lib/shopify"

const hero = await getStorefrontHero("pokemon-hero")
const visual = await getStorefrontVisual("homepage-category-pokemon")
```

---

## 1. Metaobject definitions

Created automatically by `npm run setup:cms`. Do **not** create them manually in
Admin unless you are debugging — the script is the source of truth.

### Storefront Hero (`storefront_hero`)

| Field | Key | Type | Notes |
| --- | --- | --- | --- |
| Key | `key` | Single line text | **Required**. Unique lookup id (also used as entry handle). |
| Title | `title` | Single line text | Collection page H1 (`/pokemon`, `/preorders`, …) |
| Heading | `heading` | Multi-line text | **Homepage carousel only**. Use a line break for a second line (second line renders green). |
| Description | `description` | Multi-line text | Supporting copy (collection hero + homepage) |
| Desktop image | `desktop_image` | File (image) | Primary hero art |
| Mobile image | `mobile_image` | File (image) | Optional secondary image |
| Eyebrow | `eyebrow` | Single line text | **Homepage carousel only** — small label above the heading |
| CTA text | `cta_text` | Single line text | **Homepage carousel only** — primary button label |
| CTA link | `cta_link` | Single line text | **Homepage carousel only** — primary button href |
| Enabled | `enabled` | Boolean | When false, storefront uses local fallbacks |

**What each surface reads**

| Surface | Fields |
| --- | --- |
| Collection pages (`/pokemon`, …) | `title`, `description`, `desktop_image` (≥ sm), `mobile_image` (< sm, falls back to desktop), `enabled` |
| Homepage carousel | `eyebrow`, `heading`, `description`, `cta_text`, `cta_link`, `desktop_image`, `mobile_image`, `enabled` |

Storefront access: `PUBLIC_READ` (set by the setup script).

### Storefront Visual (`storefront_visual`)

| Field | Key | Type | Notes |
| --- | --- | --- | --- |
| Key | `key` | Single line text | **Required**. Unique lookup id |
| Image | `image` | File (image) | Primary artwork |
| Mobile image | `mobile_image` | File (image) | Optional |
| Alt | `alt` | Single line text | Accessibility text (also used as card title when needed) |
| Link | `link` | Single line text | Optional card destination |

Storefront access: `PUBLIC_READ`.

---

## 2. Expected keys

### Storefront Heroes

| Key | Used for |
| --- | --- |
| `homepage` | Homepage marketing hero copy / images |
| `pokemon-hero` | `/pokemon` hero + homepage carousel Pokémon slide |
| `onepiece-hero` | `/one-piece` hero + homepage One Piece slide |
| `preorders-hero` | `/preorders` hero + homepage Preorders slide |
| `new-releases-hero` | `/new-releases` hero |
| `accessories-hero` | Accessories merchandising hero |

Future TCGs follow `{prefix}-hero` where `prefix` is the collection handle with
hyphens removed (`digimon-hero`, `yugioh-hero`, `gundam-hero`).

### Storefront Visuals — homepage category cards

| Key | Used for |
| --- | --- |
| `homepage-category-pokemon` | Shop by Category → Pokémon |
| `homepage-category-onepiece` | Shop by Category → One Piece |
| `homepage-category-preorders` | Shop by Category → Preorders |
| `homepage-category-accessories` | Shop by Category → Accessories |

Also reused as optional artwork for TCG picker cards on merchandising pages
(`homepage-category-{gamePrefix}`).

Homepage carousel slides do **not** use Visuals — each slide is fully controlled
by its Storefront Hero (`pokemon-hero`, `onepiece-hero`, `preorders-hero`)
including `desktop_image` / `mobile_image`.

### Storefront Visuals — language cards

| Key | Used for |
| --- | --- |
| `pokemon-japanese` | Pokémon → Japanese |
| `pokemon-english` | Pokémon → English |
| `pokemon-chinese` | Pokémon → Chinese |
| `pokemon-korean` | Pokémon → Korean |
| `onepiece-japanese` | One Piece → Japanese |
| `onepiece-english` | One Piece → English |

Pattern: `{gamePrefix}-{languageSlug}` where `gamePrefix` strips hyphens from
the Shopify collection handle (`one-piece` → `onepiece`).

Future placeholders seeded by the script (images left empty until assets exist):

| Key |
| --- |
| `lorcana-english` |
| `yugioh-japanese` |
| `digimon-english` |
| `gundam-japanese` |

---

## 3. Replace hero images / collection H1 copy

1. Run `npm run setup:cms` once so definitions + entries exist.
2. Open **Content → Metaobjects → Storefront Hero**.
3. Open the entry by key (e.g. `pokemon-hero`).
4. Edit **`title`** / **`description`** for collection pages (`/pokemon`).
5. Edit **`eyebrow`** / **`heading`** / **CTA** / **`desktop_image`** / **`mobile_image`** for the homepage carousel slide (same entry).
6. Ensure **Enabled** is true → Save.

Or upload a new file under **Content → Files**, then attach it on the entry.

The storefront loads CMS metaobjects with `cache: "no-store"` so Admin image and
copy edits appear on the next page request (no multi-minute Data Cache lag).

---

## 4. Replace category / language card images

1. Open **Content → Metaobjects → Storefront Visual**.
2. Open the entry (e.g. `homepage-category-pokemon` or `pokemon-japanese`).
3. Replace `image` (and optional `mobile_image`).
4. Update `alt` / `link` if needed → Save.

Prefer square or product-style PNGs/WebPs with transparent backgrounds — layouts
crop with CSS and are not redesigned per upload.

Keep the `key` field stable. Renaming a key breaks the storefront lookup until
code (or a new entry) matches again.

---

## 5. Add a new TCG without storefront architecture changes

Example: Digimon.

1. Create Shopify collections as today (`digimon`, `digimon-japanese`, …).
2. Create a **Storefront Hero** entry (or re-run setup after extending the seed list):
   - `key`: `digimon-hero`
   - Set `title` (collection H1) and `description`
   - Optionally set homepage `heading` / `eyebrow` / CTA
   - Upload desktop (and optional mobile) art
3. Create **Storefront Visual** entries for languages:
   - `digimon-japanese`, `digimon-english`, …
4. Optional homepage category card:
   - `homepage-category-digimon`

Optional homepage carousel support still requires a code touch today (slide list
is fixed to Pokémon / One Piece / Preorders). Collection pages, language cards,
and merch game pickers pick up `{prefix}-hero` / visuals automatically.

No importer, cart, checkout, product, or routing changes are required for the
marketing assets themselves.

---

## 6. Add language cards

1. Add a Visual entry with key `{gamePrefix}-{language}` (e.g. `pokemon-spanish`).
2. Set `alt`, `link` (`/pokemon/spanish`), and `image`.
3. Ensure the corresponding Shopify collection / facet exists so the route resolves.

When a Visual exists with an image, it overrides the Shopify collection image on
language cards. Otherwise the collection / first-product image is kept.

---

## 7. Fallbacks & developer notes

- Local fallbacks live in `lib/shopify/storefrontCms.ts` (`HERO_FALLBACKS` /
  `VISUAL_FALLBACKS`) and mirror the previous hardcoded `/public/products/…`
  paths.
- `getStorefrontHero(key)` / `getStorefrontVisual(key)` always return a typed
  object. Missing Shopify content is non-fatal.
- Atmosphere gradients and CSS layout classNames stay in code — only image URLs
  and marketing copy come from Metaobjects.
- Do not fetch Metaobjects from client components; load in `lib/shopify` or
  server pages and pass props (see homepage `app/(store)/page.tsx`).
- Re-running `npm run setup:cms` is safe: definitions and entries are not
  duplicated; only missing fields/images are filled.

---

## 8. Product Release Date metafield

Official product release dates are stored as a Shopify **Product** metafield.
The storefront reads it on every product fetch and uses it to sort the homepage
**Newest Arrivals** rail.

| | |
| --- | --- |
| Namespace | `custom` |
| Key | `release_date` |
| Name | Official Release Date |
| Type | Date (`date`) |
| Owner | Product |
| Pinned | Yes (required — Admin only auto-shows pinned metafields) |
| Storefront access | `PUBLIC_READ` (set by setup script) |

Created automatically by `npm run setup:cms` (idempotent — safe to re-run).
The setup script also **pins** the definition so the native date picker appears
under **Product metafields** on every product page.

### How the storefront uses it

- Queried on all Storefront product loads via `PRODUCT_FIELDS` as
  `releaseDate: metafield(namespace: "custom", key: "release_date")`.
- Mapped onto app `Product.releaseDate` (`YYYY-MM-DD` when set).
- **Newest Arrivals** sorts by `release_date` descending. Products without a
  value fall back to Shopify `createdAt` (same behavior as before until
  merchants fill dates).
- Collection “Release Date” sort and product specs prefer this metafield when
  present (existing title/slug heuristics remain as secondary fallbacks).

### How merchants edit it in Shopify

1. Open **Shopify Admin → Products** and select a product.
2. Scroll to **Metafields** (or **Product metafields**).
3. Find **Official Release Date** (`custom.release_date`) and set the official date.
4. Save the product.

If the field is missing from the product editor:

1. Go to **Settings → Custom data → Products**.
2. Confirm a definition named **Official Release Date** (`custom.release_date`, type
   Date) exists, is **pinned**, and has Storefront access enabled.
3. If it does not, run `npm run setup:cms` (requires Admin `write_products`).

Leaving **Release Date** empty is fine — the storefront keeps working and sorts
that product by when it was created in Shopify.
