# Storefront CMS (Shopify Metaobjects)

Marketing heroes, category cards, language cards, promotional artwork, and
homepage merchandising (featured products, featured collections, timed
promotions) are managed in Shopify as Metaobjects. A single **Homepage**
metaobject orchestrates which of those entries appear on `/`. The Next.js
storefront reads them at runtime and falls back to local `/public` assets or
catalog queries when an entry or image is missing.

Product **Release Date** (`custom.release_date`) is a Product metafield created
by the same setup script — see [§9](#9-product-release-date-metafield).

After this setup, changing a hero banner or category image never requires a
code change or redeploy.

## One-command setup

```bash
npm run setup:cms
```

This runs `scripts/setup-storefront-cms.ts` against the Admin GraphQL API and:

1. Creates (or verifies) metaobject definitions:
   - `storefront_hero`, `storefront_visual`
   - `homepage_featured_product`, `homepage_featured_collection`, `homepage_promotion`
   - `homepage` (orchestration — references the merchandising types above)
2. Creates (or verifies) the Product metafield `custom.release_date` (Date)
3. Seeds hero + visual entries by stable `key` (idempotent — no duplicates)
4. Seeds one Homepage entry (handle `homepage`) with section toggles on
5. Uploads matching `/public` images to Shopify Files and attaches them when missing
6. Verifies the Storefront API returns Shopify data for sample keys (and that merchandising types are readable)

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
import { getHomepagePageData, getStorefrontHero } from "@/lib/shopify"

const page = await getHomepagePageData()
const hero = await getStorefrontHero("pokemon-hero")
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

### Homepage Featured Product (`homepage_featured_product`)

Curated product rail entries (sort order + optional badge). When **any** enabled
entries exist, they power the first homepage product carousel. When none exist,
the storefront falls back to Coming Soon (`preorders` collection / preorder tags).

| Field | Key | Type | Notes |
| --- | --- | --- | --- |
| Product | `product` | Product reference | **Required**. Published product on the Storefront channel. |
| Badge | `badge` | Single line text | Optional card badge override (e.g. `Staff Pick`) |
| Sort order | `sort_order` | Integer | Lower numbers first (default `0`) |
| Enabled | `enabled` | Boolean | Disabled entries are skipped |

### Homepage Featured Collection (`homepage_featured_collection`)

Curated Shop by Category cards. When **any** enabled entries resolve (collection
+ image), they replace Visual-based category cards. When none exist, the
storefront falls back to Storefront Visual keys (`homepage-category-*`).

| Field | Key | Type | Notes |
| --- | --- | --- | --- |
| Collection | `collection` | Collection reference | **Required** |
| Title override | `title_override` | Single line text | Optional; defaults to collection title |
| Description override | `description_override` | Multi-line text | Optional card subtitle |
| Image override | `image_override` | File (image) | Optional; defaults to collection image |
| Sort order | `sort_order` | Integer | Lower numbers first |
| Enabled | `enabled` | Boolean | Disabled entries are skipped |

### Homepage Promotion (`homepage_promotion`)

Optional mid-page promo band. Renders only when an entry is **enabled**, within
`start_date` / `end_date` (when set), and has at least one image. Otherwise the
homepage layout is unchanged (no empty promo slot).

| Field | Key | Type | Notes |
| --- | --- | --- | --- |
| Title | `title` | Single line text | **Required** |
| Description | `description` | Multi-line text | Supporting copy |
| Desktop image | `desktop_image` | File (image) | Primary art (≥ sm) |
| Mobile image | `mobile_image` | File (image) | Optional; falls back to desktop |
| CTA text | `cta_text` | Single line text | Button label (default `Shop Now`) |
| CTA link | `cta_link` | Single line text | Button href |
| Start date | `start_date` | Date and time | Optional schedule start |
| End date | `end_date` | Date and time | Optional schedule end |
| Enabled | `enabled` | Boolean | Master switch |

### Homepage (`homepage`)

**Orchestration layer only** — does not redefine Hero / Promotion / Featured
content. One entry (prefer handle `homepage`) is the single source of truth for
`/`. The storefront fetches this metaobject and resolves nested references.

When **no** Homepage entry exists, the storefront keeps legacy behavior:
scan enabled Featured Product / Collection / Promotion entries, use the
hardcoded hero carousel keys, and show all sections.

| Field | Key | Type | Notes |
| --- | --- | --- | --- |
| Hero | `hero` | Metaobject reference → `storefront_hero` | Optional. When set + enabled, powers the hero (single slide). When empty, falls back to the multi-slide carousel (`pokemon-hero`, `onepiece-hero`, `preorders-hero`). |
| Promotion | `promotion` | Metaobject reference → `homepage_promotion` | Optional. Empty → no promo band (does not scan other promotions). |
| Featured Products | `featured_products` | List of metaobject references → `homepage_featured_product` | List order is display order. Empty + Show Coming Soon → Coming Soon catalog fallback. |
| Featured Collections | `featured_collections` | List of metaobject references → `homepage_featured_collection` | List order is display order. Empty → Storefront Visual category cards. |
| Featured Products Title | `featured_products_title` | Single line text | Heading when the first rail is curated (default `Featured`). Coming Soon fallback still uses `Coming Soon`. |
| Featured Collections Title | `featured_collections_title` | Single line text | Shop by Category heading (default `Shop by Category`). |
| Show Latest Releases | `show_latest_releases` | Boolean | Newest Arrivals rail (default on when unset) |
| Show Coming Soon | `show_coming_soon` | Boolean | Coming Soon rail when Featured Products is empty (default on). Featured Products still show when referenced. |
| Show Categories | `show_categories` | Boolean | Shop by Category section |
| Show Newsletter | `show_newsletter` | Boolean | Newsletter section |

Storefront access: `PUBLIC_READ`. Setup seeds handle `homepage`.

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

## 5. Merchandising homepage products, collections, and promotions

1. Run `npm run setup:cms` so the homepage merchandising + **Homepage**
   orchestration definitions and the seeded `homepage` entry exist.
2. Create leaf entries under **Content → Metaobjects** as needed:
   - **Homepage Featured Product** — pick products, set sort order / badge / enabled
   - **Homepage Featured Collection** — pick collections, optional overrides
   - **Homepage Promotion** — copy, images, CTA, schedule, enabled
3. Open the **Homepage** entry (handle `homepage`):
   - Attach Hero / Promotion / Featured Products / Featured Collections
   - Set Featured Products Title / Featured Collections Title
   - Toggle Show Latest Releases / Coming Soon / Categories / Newsletter
4. Save. The next homepage request picks up changes (`cache: "no-store"`).

No code change is required for routine merchandising. Leave Featured Product /
Featured Collection empty on Homepage to keep Coming Soon + Visual category
fallbacks. Leave Hero empty to keep the multi-slide carousel. Leave Promotion
empty (or disabled / out of window) to hide the promo band. If the Homepage
entry is deleted, the storefront falls back to scanning leaf types independently.

---

## 6. Add a new TCG without storefront architecture changes

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

## 7. Add language cards

1. Add a Visual entry with key `{gamePrefix}-{language}` (e.g. `pokemon-spanish`).
2. Set `alt`, `link` (`/pokemon/spanish`), and `image`.
3. Ensure the corresponding Shopify collection / facet exists so the route resolves.

When a Visual exists with an image, it overrides the Shopify collection image on
language cards. Otherwise the collection / first-product image is kept.

---

## 8. Fallbacks & developer notes

- Local fallbacks live in `lib/shopify/storefrontCms.ts` (`HERO_FALLBACKS` /
  `VISUAL_FALLBACKS`) and mirror the previous hardcoded `/public/products/…`
  paths. Homepage merchandising fallbacks live in `lib/shopify/homepage.ts`
  (Coming Soon / Visual category cards) when the Homepage entry is missing or
  its featured lists are empty.
- `getHomepagePageData()` is the homepage entry point — one Homepage fetch when
  present, otherwise per-type loaders.
- `getStorefrontHero(key)` / `getStorefrontVisual(key)` always return a typed
  object. Missing Shopify content is non-fatal.
- Atmosphere gradients and CSS layout classNames stay in code — only image URLs
  and marketing copy come from Metaobjects.
- Do not fetch Metaobjects from client components; load in `lib/shopify` or
  server pages and pass props (see homepage `app/(store)/page.tsx`).
- Re-running `npm run setup:cms` is safe: definitions and entries are not
  duplicated; only missing fields/images are filled.

---

## 9. Product Release Date metafield

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
