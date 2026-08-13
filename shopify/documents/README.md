# Swift TCG — Shopify print templates

Branded packing slip, invoice, and pick list for Shopify Order Printer, plus the native packing slip used when printing from an order in admin.

Shopify Liquid variables and control logic are preserved. Only presentation is customized: logo, typography, spacing, and a black / white layout with a thin green accent.

## Brand

| Token | Value |
| --- | --- |
| Ink | `#111111` |
| Paper | `#FFFFFF` |
| Accent | `#0EA54B` |
| Support | `support@swifttcg.com` |
| Site | `https://www.swifttcg.com` |
| Logo | `public/brand/swift-tcg-logo.png` |

Print-safe: no heavy fills. The green rule prints as a dark line on black-and-white printers.

## Templates

| File | Paste into |
| --- | --- |
| `packing-slip.liquid` | **Order Printer** → Templates → Packing slip |
| `invoice.liquid` | **Order Printer** → Templates → Invoice |
| `pick-list.liquid` | **Order Printer** → Templates → new custom template named **Pick List** |
| `packing-slip.shipping.liquid` | **Settings → Shipping and delivery → Packing slips → Packing slip template** |

The shipping packing slip uses Shopify’s fulfillment Liquid (`line_items_in_shipment`, `shipping_address`, `includes_all_line_items_in_order`). Order Printer templates use `order.*` / `shop.*`.

> **Pick lists in the current Order Printer app:** the built-in Pick list type is a column editor and does not accept custom Liquid. Create a **custom** template, name it Pick List, and paste `pick-list.liquid`.

## Logo

**Order Printer** templates load the hosted lockup:

`https://www.swifttcg.com/brand/swift-tcg-logo.png`

**Native packing slip** (Shipping settings) only allows images from Shopify’s CDN. Upload `public/brand/swift-tcg-logo.png` to **Settings → Files** as `swift-tcg-logo.png` before saving `packing-slip.shipping.liquid`.

## Install

### Order Printer (invoice, packing slip, pick list)

1. Shopify admin → **Apps → Order Printer → Templates**.
2. Open **Invoice** or **Packing slip**, or create a template named **Pick List**.
3. Replace the template body with the matching `.liquid` file.
4. Save, then print a test order to PDF (US Letter).

### Native packing slip (in-box slip)

1. Upload `swift-tcg-logo.png` to **Settings → Files**.
2. **Settings → Shipping and delivery → Packing slips → Packing slip template**.
3. Replace the template with `packing-slip.shipping.liquid`.
4. Preview, then save.

Print on **US Letter**. Keep printer margins at default (templates set `@page` margin to `0.5in`). Do not add JavaScript.

## Do not remove

Leave Liquid tags such as `{{ order.order_name }}`, `{{ order.name }}`, `{{ order.line_items }}`, `{{ line_items_in_shipment }}`, `{{ shipping_address }}`, `{{ shop.address }}`, `{{ shop_address.summary }}`, tax/shipping/transaction loops, and `includes_all_line_items_in_order` in place. They are required for Shopify’s printer.
