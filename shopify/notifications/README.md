# Swift TCG — Shopify notification templates

Branded Liquid email templates for Shopify customer notifications. Shopify Liquid variables and control logic are preserved; only presentation (brand colors, logo treatment, typography, footer) is customized.

## Brand

| Token | Value |
| --- | --- |
| Background | `#FFFFFF` |
| Accent | `#0EA54B` |
| Logo | Official lockup (`/brand/swift-tcg-logo.png`) — prefer `shop.email_logo_url` when set in admin |
| Support | `support@swifttcg.com` |
| Site | `https://www.swifttcg.com` |

### Logo assets

| File | Use |
| --- | --- |
| [`public/brand/swift-tcg-logo.png`](../../public/brand/swift-tcg-logo.png) | Full lockup (storefront, Open Graph) |
| [`public/brand/swift-tcg-logo-email.png`](../../public/brand/swift-tcg-logo-email.png) | Email / Messaging headers (~320px wide) |
| [`public/brand/swift-tcg-mark.png`](../../public/brand/swift-tcg-mark.png) | Favicon / app icon (white S on black) |

**Shopify Admin notifications:** upload `swift-tcg-logo-email.png` under **Settings → Notifications → Customer notifications → Customize** (preferred). Templates fall back to the hosted PNG at `https://www.swifttcg.com/brand/swift-tcg-logo-email.png` until then.

**Messaging automations:** templates embed `https://www.swifttcg.com/brand/swift-tcg-logo-email.png` directly (re-paste after deploy if the file changes).

Also set the notification accent color to `#0EA54B` in that same Customize panel so any non-overridden Shopify UI chrome matches.

## Templates

| File | Shopify admin notification |
| --- | --- |
| `order-confirmation.liquid` | Order confirmation |
| `shipping-confirmation.liquid` | Shipping confirmation |
| `delivered.liquid` | Delivered |
| `order-cancelled.liquid` | Order canceled |
| `refund.liquid` | Order refund |
| `abandoned-checkout.liquid` | Abandoned checkout / Recover abandoned checkout |
| `recover-abandoned-cart.liquid` | Recover abandoned cart (Shopify Messaging) |
| `pick-up-where-you-left-off.liquid` | Pick up where you left off / Convert abandoned product browse (Shopify Messaging) |
| `thank-you-for-shopping.liquid` | Thank you for shopping with us / Post-purchase (Shopify Messaging) |
| `thank-you-second-purchase.liquid` | We're happy to see you again / second-purchase thank you (Shopify Messaging) |
| `customer-account-welcome.liquid` | Customer account welcome |
| `password-reset.liquid` | Customer account password reset |
| `customer-account-invite.liquid` | Customer account invite |
| `back-in-stock.liquid` | Reference template for app-sent BIS emails (Resend cron — not pasted into Admin) |

> **Note:** Password reset and account invite apply to **legacy customer accounts**. Stores on [new customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts/new-customer-accounts) use passwordless sign-in; those two notifications may not send.

> **Abandoned cart vs checkout vs browse:** `abandoned-checkout.liquid` = started checkout. `recover-abandoned-cart.liquid` = items in cart, no checkout. `pick-up-where-you-left-off.liquid` = viewed products, never added to cart. Cart/browse Messaging templates use `abandoned_visit.*`; unsubscribe lives in Shopify’s Messaging footer (do not duplicate in the body).

> **Back in Stock:** Headless alerts are stored in Shopify metafields and emailed by `/api/cron/back-in-stock` via Resend (`lib/back-in-stock/email.ts`). The Liquid file documents branding only.

## Install

1. Shopify admin → **Settings → Notifications**.
2. Open each notification listed above.
3. Click **Edit code** (confirm your sender email if prompted).
4. Replace the **Email body (HTML)** with the matching `.liquid` file contents from this folder.
5. Save, then send a test notification (or place a test order) to verify.

### Messaging automations (cart / browse / thank you)

1. Shopify admin → **Marketing** / **Messaging** → **Automations**.
2. Open or create **Recover abandoned cart**, **Convert abandoned product browse** (Pick up where you left off), or **Post-purchase** / **Thank you for shopping with us**.
3. Edit the email → use **Code your own** (or a Custom Liquid block that accepts full HTML).
4. Paste the matching file (`recover-abandoned-cart.liquid`, `pick-up-where-you-left-off.liquid`, `thank-you-for-shopping.liquid`, or `thank-you-second-purchase.liquid`).
5. For `thank-you-second-purchase.liquid`, replace `IMAGE_URL` with your thank-you image address (copy from the existing Image block), or delete the `<img>` row and keep Shopify’s Image block instead. Keep the product recommendation block below if desired.
6. Save and send a test.

Do not remove Liquid tags such as `{{ order_status_url }}`, `{{ url }}` (abandoned checkout recovery), `{{ abandoned_visit.url }}` (abandoned cart recovery), `{{ unsubscribe_url }}`, `{{ open_tracking_block }}`, `{{ customer.account_activation_url }}`, `{{ fulfillment.tracking_url }}`, or order-summary loops — they are required for Shopify functionality.

## What was branded

- White email canvas and clean spacing
- Green accent buttons and links (`#0EA54B`)
- Header logo (uploaded admin logo preferred for Admin notifications; Messaging / BIS use hosted PNG)
- Green header rule and quieter footer
- Footer contact: `support@swifttcg.com` and `https://www.swifttcg.com`
