# Swift TCG Shopify Data Standard

## Purpose

Shopify is the single source of truth for all storefront data.

After launch:

- Product prices are edited in Shopify.
- Product descriptions are edited in Shopify.
- Images are edited in Shopify.
- Inventory is managed in Shopify.
- Homepage merchandising is controlled from Shopify.
- Collection browse pages (`/[game]`, `/preorders`, `/new-releases`) load from Shopify.

No product data should ever be edited in storefront code.

Offline JSON under `data/` is written by the SORA importer for debugging and
re-sync input. It is **not** a runtime catalog.

---

## Collections

### Primary Collections

- Pokémon
- One Piece
- Accessories
- Sealed Cases

### Pokémon Language Collections

- Pokémon Japanese
- Pokémon English
- Pokémon Korean
- Pokémon Chinese

Each language should have its own customer-facing collection and URL.

### One Piece Language Collections

- One Piece Japanese
- One Piece English

### Homepage Collections

- Featured
- New Arrivals
- Preorders
- Coming Soon
- Best Sellers
- Sale

These are the standard merchandising collections. Sync auto-assigns status-driven
membership for Preorders, Coming Soon, and New Arrivals (see below). Featured,
Best Sellers, and Sale stay merchant-curated.

No homepage products should ever be hardcoded in application code.

### New Arrivals membership rule

Sync owns `new-arrivals` membership automatically. **No manual collection management is required.**

`new-arrivals` must always represent products customers can purchase today.

#### Qualifies (joined on sync)

A product belongs in New Arrivals only when **all** of the following are true:

1. Effective storefront status is exactly **In Stock** (`instock`)
2. Retail price is a finite number (**purchasable** — not Coming Soon)
3. Shopify product status is **ACTIVE** (not Archived or Draft)
4. Shopify reports the product/variant as **available for sale** (inventory for sale)

#### Leaves automatically (removed on the next sync)

A product is removed from New Arrivals when any of the following becomes true:

| State | Trigger |
| --- | --- |
| Sold Out | Catalog/sync status `soldout`, or Shopify not available for sale |
| Preorder | Effective status is `preorder` (including Ready to Release) |
| Coming Soon | Retail price is null |
| Archived | Shopify product status is `ARCHIVED` (also excludes `DRAFT`) |

Membership changes are **idempotent**: re-running sync only joins or leaves when qualification changed.

Implemented in `isNewArrivalProduct` / `resolveProductCollectionKeys` / `assignCollections` (`SYNC_OWNED_COLLECTION_KEYS` includes `new-arrivals`) in `lib/shopify/sync.ts`.

Merchant-curated homepage collections (**Featured**, **Best Sellers**, **Sale**) are never auto-assigned or auto-removed.

---

### Availability lifecycle (collections)

```
Coming Soon          →  coming-soon collection (unpriced; auto-joined)
       ↓
Preorder             →  preorders collection (tag: preorder; sync-owned)
       ↓
(Manual approval in Shopify — tag: release-approved)
       ↓
New Arrivals         →  leaves preorders; joins new-arrivals (in stock + purchasable; sync-owned)
       ↓
Sold Out / Archived  →  leaves new-arrivals (and preorders when no longer qualifying)
```

**Sync-owned leave** applies only to `preorders` and `new-arrivals`
(`SYNC_OWNED_COLLECTION_KEYS` in `lib/shopify/sync.ts`). `coming-soon` is
auto-joined for unpriced products but is not auto-left by sync — clear it in
Admin (or extend sync ownership) when a SKU is priced.

Ready to Release (`ready-to-release` tag) stays on **Preorder** / `preorders` until merchant approval — it does **not** enter New Arrivals early.

---

## Preorder Release Workflow

Sync never auto-converts a preorder to in-stock when the release date arrives.

### Stages

1. **Preorder (pending)** — Catalog/import status is `preorder` and the release date is still in the future. Tag: `preorder`. Collection: `preorders`.
2. **Ready to Release** — Release date is today or earlier. Sync adds internal tag `ready-to-release` and **keeps** `preorder`. Storefront availability stays preorder. Collection: still `preorders` (not New Arrivals).
3. **Merchant approval** — In Shopify Admin, add the tag `release-approved`.
4. **Released (next sync)** — Sync:
   - Removes `preorder`, `ready-to-release`, and `release-approved`
   - Adds sticky tag `released` (so later imports that still say preorder cannot undo the conversion)
   - Leaves the `preorders` collection
   - Joins `new-arrivals` when the product qualifies (in-stock + purchasable + ACTIVE + for sale)
   - Storefront availability becomes in-stock (`preorder` tag gone)

The workflow is idempotent: re-running sync on an already-released product is a no-op aside from keeping `released` and reaffirming collection membership.

### Workflow tags (internal — not storefront-facing)

| Tag | Meaning |
| --- | --- |
| `ready-to-release` | Release date reached; awaiting merchant approval |
| `release-approved` | Merchant approval signal (consumed on next sync) |
| `released` | Sticky marker that conversion already happened |

Storefront mapping ignores these tags. Only removing `preorder` changes storefront availability.

Implemented in `lib/shopify/preorderRelease.ts` and wired through `lib/shopify/sync.ts`.

---

## Product Status

Allowed statuses:

- Coming Soon
- Preorder
- In Stock
- Sold Out
- Discontinued

Each product must have exactly one storefront status.

---

## Standard Shopify Fields

These fields are required on every product.

| Field | Requirement |
| --- | --- |
| Title | Required |
| Description | Required |
| Price | Required |
| Compare-at Price | Required when on sale; otherwise optional |
| Images | Required |
| Vendor | Required |
| Product Type | Required |
| Collections | Required |
| Tags | Required |
| Inventory | Required |
| SEO Title | Required |
| SEO Description | Required |
| URL Handle | Required |

---

## Product Types

Allowed product types:

- Booster Box
- Booster Pack
- Starter Deck
- Premium Collection
- Collection Box
- Deck Box
- Sleeves
- Binder
- Playmat
- Case

No custom product types outside this list unless approved.

---

## Languages

Allowed values:

- Japanese
- English
- Korean
- Chinese

---

## Tags

Tags are for organization and automation only.

### Game

- `pokemon`
- `one-piece`

### Set

- `sv11b`
- `op11`

### Product

- `booster-box`
- `starter-deck`
- `premium`

### Marketing

- `limited`
- `restock`
- `pokemon-center`

### Preorder release workflow (sync-owned)

- `ready-to-release` — release date reached; still sold as preorder
- `release-approved` — merchant approval in Shopify (consumed on next sync)
- `released` — sticky marker after approved conversion to in-stock

See [Preorder Release Workflow](#preorder-release-workflow).

Tags should not replace collections.

---

## Metafields

### Release Date

| | |
| --- | --- |
| Namespace | `custom` |
| Key | `release_date` |
| Type | Date |
| Setup | `npm run setup:cms` (see `docs/STOREFRONT_CMS.md` §8) |

**Purpose:** Official product release date. Powers Newest Arrivals sorting
(`release_date` DESC, fallback `createdAt`), collection browse sort
(Newest / Oldest Release), Release Year filters, and the PDP Specifications
row. Optional — products without a value keep working; the Release Date row
is hidden.

### Language

| | |
| --- | --- |
| Namespace | `custom` |
| Key | `language` |
| Type | Single line text |
| Setup | `npm run setup:cms` |

**Purpose:** PDP Language row and collection Language filter. When empty, the
storefront falls back to a known language tag (`japanese`, `english`,
`korean`, `chinese`).

### Series / Set

| | |
| --- | --- |
| Namespace | `custom` |
| Key | `series` |
| Type | Single line text |
| Setup | `npm run setup:cms` |

**Purpose:** PDP Series / Set row. When empty, a set-code tag (e.g. `sv11b`)
may be shown as a fallback.

### Condition

| | |
| --- | --- |
| Namespace | `custom` |
| Key | `condition` |
| Type | Single line text |
| Setup | `npm run setup:cms` |

**Purpose:** PDP Condition row (e.g. Factory Sealed). Hidden when empty.

### Rarity

| | |
| --- | --- |
| Namespace | `custom` |
| Key | `rarity` |
| Type | Single line text |
| Setup | `npm run setup:cms` |

**Purpose:** PDP Rarity row when applicable. Hidden when empty.

### Product Code

| | |
| --- | --- |
| Namespace | `custom` |
| Key | `product_code` |
| Type | Single line text |
| Setup | `npm run setup:cms` |

**Purpose:** Manufacturer / distributor product code on the PDP. Hidden when empty.

### Homepage position (Coming Soon rail)

| | |
| --- | --- |
| Namespace | `swift` |
| Key | `homepage_position` |
| Type | Integer (`number_integer`) |
| Setup | `npm run setup:cms` |

**Purpose:** Manual sort for the homepage **Coming Soon** carousel only.
Products with a value sort ascending (1, 2, 3…). Products without the field
appear after all positioned products. Same values keep Shopify collection order.
Does not affect collections, search, or other listings.

### Customer Wishlist

| | |
| --- | --- |
| Namespace | `swift` |
| Key | `wishlist` |
| Owner | Customer |
| Type | List of product references (`list.product_reference`) |
| Setup | `npm run setup:wishlist` |

**Purpose:** Persistent per-customer wishlist for the headless storefront.
Stores product GIDs only; product cards hydrate via Storefront `nodes(ids:)`.

**Access:** Enable Customer Account API **Read and write** on the definition
(Admin → Settings → Custom data → Customers → Wishlist). Until that is set,
runtime falls back to Admin API `metafieldsSet` (requires `read_customers` /
`write_customers`). Shopify remains the single source of truth — no custom DB.

### Customer Back in Stock

| | |
| --- | --- |
| Namespace | `swift` |
| Key | `back_in_stock` |
| Owner | Customer |
| Type | JSON (`[{ productId, subscribedAt }]`) |
| Setup | `npm run setup:back-in-stock` |

**Purpose:** Per-customer sold-out alerts for the headless storefront (account
UI + unsubscribe). Dates are required for `/account/notifications`.

**Reverse index (scale):** Product metafield `swift.bis_subscribers` stores
`[{ customerId, subscribedAt }]` so the cron can fan out without scanning all
customers. Shop metafield `swift.bis_watched_products` lists product GIDs with
active subscribers so inventory checks stay O(watched products).

**Access:** Enable Customer Account API **Read and write** on the customer
definition. Product/shop indexes always use Admin API (`read_products` /
`write_products`, `read_customers` / `write_customers`).

**Automation:** Vercel Cron `GET /api/cron/back-in-stock` (every 15m) claims
subscribers via `compareDigest`, sends Resend email
(“Your item is back in stock!”), then removes the subscription. Failed sends
are re-queued; successful sends never email twice.

### Product Reviews

| | |
| --- | --- |
| Metaobject type | `swift_product_review` (Shopify reserves `product_review`) |
| Product aggregates | `swift.review_rating`, `swift.review_count`, `swift.review_breakdown` |
| Customer helpful votes | `swift.review_helpful_votes` (JSON array of metaobject GIDs) |
| Setup | `npm run setup:reviews` |
| Docs | `docs/PRODUCT_REVIEWS.md` |

**Purpose:** Moderated customer reviews. Metaobjects are Admin-only (pending
reviews never leak via Storefront). Approved aggregates are denormalized onto
products for card/PDP performance. Purchase verification uses Admin order
line items (`read_orders`).

**Moderation:** Status field `pending` → `approved` | `rejected` in Admin
(Content → Metaobjects). `npm run setup:reviews` registers webhooks to
`/api/webhooks/reviews`; hourly cron `/api/cron/reviews` is a fallback for
recomputing product aggregates after approval.

### Ships On

**Purpose:** Date orders begin shipping.

May differ from Release Date.

### Featured

Boolean.

Controls homepage placement.

### Homepage Priority

Number.

Higher numbers appear first.

### Badge

Allowed values:

- New
- Best Seller
- Limited
- Staff Pick
- Exclusive
- Restock

### Import Source

Examples:

- SORA
- Distributor

Internal use only.

---

## Homepage Rules

Homepage sections are powered by a single Shopify **Homepage** metaobject when
present (`lib/shopify/homepage.ts` → `getHomepagePageData`). That entry
references Hero / Promotion / Featured Product / Featured Collection
metaobjects and toggles section visibility. When no Homepage entry exists,
product rails prefer per-type merchandising metaobjects; otherwise they use
catalog / collection fallbacks. No homepage products are hardcoded in page files.

| Section (UI) | Primary source (Homepage entry) | Fallback (no Homepage / empty refs) |
| --- | --- | --- |
| Hero carousel | `homepage.hero` → `storefront_hero` | Hardcoded slide keys → local `/public` hero art |
| Featured / Coming Soon rail | `homepage.featured_products` (+ `show_coming_soon`) | All enabled `homepage_featured_product` → `preorders` / tags |
| Shop by Category | `homepage.featured_collections` (+ `show_categories`) | All enabled `homepage_featured_collection` → `storefront_visual` `homepage-category-*` |
| Promotion band | `homepage.promotion` | All enabled in-window `homepage_promotion` (or hidden) |
| Newest Arrivals | Catalog when `show_latest_releases` | Always on when no Homepage entry |
| Newsletter | `show_newsletter` | Always on when no Homepage entry |

Loaders: `lib/shopify/homepage.ts`, `lib/shopify/homepageMerchandising.ts`,
`lib/shopify/storefrontCms.ts`.

### Standard homepage collections

These collections are part of the Shopify data standard and are created/ensured by sync. Merchants may curate them in Admin. The storefront may wire additional rails to them later without schema changes:

| Collection | Handle | Sync ownership |
| --- | --- | --- |
| Featured | `featured` | Merchant-curated only |
| Coming Soon | `coming-soon` | Auto-joined for unpriced non-sold-out products |
| Preorders | `preorders` | Sync-owned (join + leave) |
| New Arrivals | `new-arrivals` | Sync-owned (join + leave); powers `/new-releases` |
| Best Sellers | `best-sellers` | Merchant-curated only |
| Sale | `sale` | Merchant-curated only |

No homepage merchandising should require code changes once metaobject entries
(or a wired collection rail) are populated in Shopify Admin.

---

## SEO Rules

Every product should contain:

- SEO Title
- SEO Description
- Clean URL Handle

---

## Product Naming Standard

Use one consistent format.

Examples:

- `Pokemon Scarlet & Violet Black Bolt Booster Box (Japanese)`
- `One Piece OP-11 A Fist of Divine Speed Booster Box (Japanese)`

Never abbreviate titles unless the manufacturer does.

---

## Images

Every product should include:

- Primary image
- Additional product images when available

Never use placeholder images once the product is live.

---

## Informational content (pages & policies)

Shopify is the single source of truth for customer-facing informational content.
Edit copy in Shopify Admin — not in the Next.js codebase.

### Native shop policies

Configure under **Settings → Policies**. The storefront renders them at:

| Policy | Storefront path | Typical handle |
| --- | --- | --- |
| Shipping Policy | `/policies/shipping-policy` | `shipping-policy` |
| Refund Policy | `/policies/refund-policy` | `refund-policy` |
| Privacy Policy | `/policies/privacy-policy` | `privacy-policy` |
| Terms of Service | `/policies/terms-of-service` | `terms-of-service` |

### Online Store pages

Create pages under **Online Store → Pages**. Publish them to the Headless /
Storefront sales channel. The storefront renders any page at:

`/pages/{handle}`

Recommended handles (footer + nav):

| Page | Handle | Path |
| --- | --- | --- |
| About Swift TCG | `about` | `/pages/about` |
| Contact | `contact` | `/pages/contact` |
| FAQ | `faq` | `/pages/faq` |
| Preorder Policy | `preorder-policy` | `/pages/preorder-policy` |

New pages only need a Shopify page with a handle — no app code changes.
They appear at `/pages/{handle}` automatically.

#### Contact page metafields

Namespace: `swift` (Shop and/or Page). Expose to Storefront API.

| Key | Type | Purpose |
| --- | --- | --- |
| `business_email` | Single line text | Contact email |
| `response_time` | Single line text | e.g. “Within 1–2 business days” |
| `instagram_url` | URL | Instagram |
| `x_url` | URL | X (Twitter) |
| `discord_url` | URL | Discord (optional) |
| `youtube_url` | URL | YouTube (optional) |

Shop-level metafields feed the footer Community social links. Page-level
values on `contact` override shop values when set.

#### FAQ page authoring

On the `faq` page body, use Shopify’s rich text editor:

- **Heading 2** → section title (e.g. Shipping)
- **Heading 3** → question
- Following paragraphs / lists → answer (rich text allowed)

The storefront parses that structure into an accordion. If headings are
missing, the page falls back to rendering the HTML body as-is.

### Storefront permission

Headless channel needs `unauthenticated_read_content` for pages and policies.

---

## Business Rule

After launch, the owner should never need to modify code for:

- Prices
- Inventory
- Descriptions
- Images
- Homepage products
- Collections
- SEO
- Product visibility
- Informational pages (About, Contact, FAQ, Preorder Policy, …)
- Legal policies (Shipping, Refund, Privacy, Terms)
- Contact email, response time, and social links

Those changes must be manageable entirely from Shopify.

---

## Future Expansion

This standard should support additional games without changing the data model.

Examples:

- Yu-Gi-Oh!
- Digimon
- Dragon Ball Super
- Gundam Card Game
- Disney Lorcana

No structural changes should be required to support additional TCGs.
