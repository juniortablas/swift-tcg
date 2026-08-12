# Product Reviews

Swift TCG product reviews are stored entirely in Shopify — no separate database.

## Overview

| Concern | Shopify resource |
| --- | --- |
| Review body | Metaobject `swift_product_review` |
| Card / PDP aggregates | Product metafields `swift.review_rating`, `swift.review_count`, `swift.review_breakdown` |
| Helpful vote dedupe | Customer metafield `swift.review_helpful_votes` |
| Auth / purchase check | Customer Account session + Admin order line items |

Reviews are **moderated**. New submissions are `pending` and never appear on the storefront until an admin sets status to `approved` in Shopify.

> **Note:** Shopify reserves the type name `product_review` for system use. This app uses `swift_product_review`.

## Setup

### 1. Admin scopes

Enable on the Dev Dashboard app, then **reinstall/update** the app on the store:

- `read_metaobject_definitions`, `write_metaobject_definitions`
- `read_metaobjects`, `write_metaobjects`
- `read_products`, `write_products`
- `read_customers`, `write_customers`
- `read_orders` (purchase verification — required or “Write a Review” will fail purchase checks)
- `read_files`, `write_files` (review photos)

### 2. Create definitions

```bash
npm run setup:reviews
# dry run:
npm run setup:reviews -- --dry-run
```

This creates:

- Metaobject **Swift Product Review** (`swift_product_review`) — Storefront access **NONE**
- Product metafields `swift.review_rating`, `swift.review_count`, `swift.review_breakdown`
- Customer metafield `swift.review_helpful_votes`

### 3. Storefront Read on product aggregates

Card/PDP stars come from product metafields. After setup, for each of:

- Review rating (`swift.review_rating`)
- Review count (`swift.review_count`)
- Review breakdown (`swift.review_breakdown`)

In Admin:

1. **Settings → Custom data → Products**
2. Open the definition
3. **Storefront API access → Read** (or “Storefronts” → Public read)
4. Save

**Do not** enable Storefront read on the `swift_product_review` metaobject. Pending reviews must stay Admin-only.

### 4. Webhooks (automatic)

`npm run setup:reviews` registers these subscriptions via Admin GraphQL
`webhookSubscriptionCreate` (idempotent — skips topics that already point at the
same callback):

| Topic | Filter |
| --- | --- |
| `METAOBJECTS_CREATE` | `type:swift_product_review` |
| `METAOBJECTS_UPDATE` | `type:swift_product_review` |
| `METAOBJECTS_DELETE` | `type:swift_product_review` |

Callback URI: `{SHOPIFY_APP_URL}/api/webhooks/reviews`  
(defaults to `https://www.swifttcg.com/api/webhooks/reviews` when `SHOPIFY_APP_URL` is unset)

HMAC verification uses `SHOPIFY_WEBHOOK_SECRET` if set, otherwise `SHOPIFY_CLIENT_SECRET`.

No manual webhook creation in Shopify Admin is required.

### 5. Cron fallback

`vercel.json` already schedules hourly `GET /api/cron/reviews`.

Set `CRON_SECRET` in Vercel env (same value used for back-in-stock). Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.

## Moderation

1. Customer submits a review → metaobject created with `status=pending`.
2. Admin → **Content → Metaobjects → Swift Product Review**.
3. Open the entry → set **Status** to `approved` or `rejected`.
4. Registered webhooks (or the hourly cron) write updated averages onto the product.

Approved reviews appear on the PDP (lazy-loaded) and drive card ratings.

## Customer experience

- **Product cards:** `★★★★★ 4.8 (124)` or `No reviews yet`.
- **PDP:** summary, breakdown, write CTA, sortable list (newest / highest / lowest), helpful votes, photo gallery.
- **Write a review:** logged-in purchasers only; guests are redirected through `/account/login` and return with `?write-review=1`.
- **Verified Purchase:** set automatically when an order containing the product is found.
- **Account → Reviews** (`/account/reviews`): list all submitted reviews; edit/delete pending reviews.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/reviews?productId=&page=&sort=` | Paginated approved reviews |
| `GET /api/reviews?productId=&view=eligibility` | Can this customer review? |
| `POST /api/reviews` | Submit review (JSON) or upload photo (`multipart`) |
| `POST /api/reviews/[id]` | Mark helpful (`{ "action": "helpful" }`) |
| `PATCH /api/reviews/[id]` | Edit pending review |
| `DELETE /api/reviews/[id]` | Delete pending review |
| `POST /api/webhooks/reviews` | Aggregate sync on metaobject change |
| `GET /api/cron/reviews` | Hourly aggregate sync |

## Components

Reusable UI under `components/reviews/`:

`ReviewStars`, `ReviewSummary`, `ReviewCard`, `ReviewGallery`, `ReviewModal`, `HelpfulButton`, `ReviewList`, `ReviewFilters`, `ProductRating`, `ProductReviewsSection`, `ReviewsJsonLd` (legacy alias)

Prefer `components/seo/ProductJsonLd` on the PDP for full Product + Offer + AggregateRating + Review schema.

Provider: `lib/reviews/ReviewsProvider.tsx` + `useReviews()`.

## SEO

PDP always emits JSON-LD `Product` + `Offer` (price, availability, brand) via `ProductJsonLd`. When approved reviews exist, `AggregateRating` and individual `Review` nodes are included. Visible review cards still lazy-load via IntersectionObserver so listing latency does not block first paint.
