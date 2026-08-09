/**
 * Seed Shopify informational content for the headless storefront.
 *
 * Creates/updates:
 * - Online Store pages: about, faq, preorder-policy (contact left as-is if present)
 * - Shop policies: shipping, refund, terms (privacy left as-is if present)
 * - Shop metafield definitions + starter values under namespace `swift`
 *
 * Requires Admin scopes:
 *   write_content (or write_online_store_pages), write_legal_policies,
 *   write_products (or write_metaobject_definitions / metafields — metafieldsSet)
 *
 * Usage: npx tsx scripts/seed-shopify-content.ts
 *        npx tsx scripts/seed-shopify-content.ts --dry-run
 *        npx tsx scripts/seed-shopify-content.ts --overwrite-pages
 *        npx tsx scripts/seed-shopify-content.ts --overwrite-contact
 */

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import {
  getShopifyAdminConfig,
  shopifyAdminFetch,
} from "@/lib/shopify/admin"
import { ShopifyClientError } from "@/lib/shopify/client"

function loadEnvFile(filename: string): void {
  const filePath = path.resolve(process.cwd(), filename)
  if (!existsSync(filePath)) return

  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const eq = trimmed.indexOf("=")
    if (eq === -1) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.SHOPIFY_DRY_RUN === "1"

type UserError = { field?: string[] | null; message: string; code?: string }

type PageNode = {
  id: string
  handle: string
  title: string
}

const PAGES: Array<{ handle: string; title: string; body: string }> = [
  {
    handle: "about",
    title: "About Swift TCG",
    body: `
<p>Swift TCG imports authentic Japanese trading card products and ships them from California.</p>
<p>We focus on factory-sealed releases, clear product details, and reliable fulfillment for collectors, local game stores, and competitive players.</p>
<p>Every listing is meant to be straightforward: what the product is, when it ships, and how it arrives.</p>
`.trim(),
  },
  {
    handle: "faq",
    title: "FAQ",
    body: `
<h2>Ordering</h2>
<h3>How do I place an order?</h3>
<p>Browse the storefront, add products to your bag, and complete checkout. You will receive an order confirmation email once payment is processed.</p>
<h3>Can I modify my order?</h3>
<p>We start processing quickly, so changes are not always possible. Contact us as soon as you can with your order number — if the order has not shipped, we will try to help.</p>
<h3>Can I cancel my order?</h3>
<p>In-stock orders can often be cancelled if they have not shipped yet. Preorder cancellations are more limited because allocations are reserved against Japanese supply. See our <a href="/pages/preorder-policy">Preorder Policy</a> for details.</p>
<h3>Why was my order cancelled?</h3>
<p>Orders may be cancelled for payment issues, suspected fraud, pricing errors, allocation limits, or supply failure. If we cancel an order, we refund eligible charges and email you.</p>

<h2>Shipping</h2>
<h3>Where do orders ship from?</h3>
<p>Orders ship from California after imported inventory clears customs and is received into our warehouse.</p>
<h3>How long does shipping take?</h3>
<p>In-stock orders are typically processed within a few business days, then handed to the carrier. Delivery timing depends on the method selected at checkout and your destination. Preorders ship after the release arrives and is processed — see each product page for estimated timing.</p>
<h3>Do you ship internationally?</h3>
<p>International shipping is offered only when it appears as an option at checkout. Duties, taxes, and customs fees may be the buyer’s responsibility unless stated otherwise. See our <a href="/policies/shipping-policy">Shipping Policy</a>.</p>
<h3>Will I receive tracking?</h3>
<p>Yes. Once your order ships, you receive a tracking email so you can follow the package.</p>

<h2>Preorders</h2>
<h3>When am I charged?</h3>
<p>Preorders are charged in full at checkout. Payment reserves your allocation for that release.</p>
<h3>Can preorder dates change?</h3>
<p>Yes. Estimated release and ship timing come from manufacturers and suppliers and may shift. Product pages show the best timing we have at the time of listing.</p>
<h3>What happens if Bandai or Pokémon delays a release?</h3>
<p>If a manufacturer or supplier delays a release, your preorder remains reserved and ships after we receive and process the product. We communicate significant delays by email when we have confirmed updates.</p>
<h3>Can I combine preorder and in-stock items?</h3>
<p>You can add both to the same bag, but they may ship separately. Cart messaging at checkout explains how mixed orders are fulfilled. See our <a href="/pages/preorder-policy">Preorder Policy</a>.</p>

<h2>Products</h2>
<h3>Are products authentic?</h3>
<p>Yes. We import authentic trading card products and do not sell counterfeits or resealed product.</p>
<h3>Are products factory sealed?</h3>
<p>When a listing says factory sealed, the product is sold sealed as received. Opened or resealed product is not what we sell under those listings.</p>
<h3>Why are some products in Japanese, Korean, or Chinese?</h3>
<p>We specialize in authentic Asian-language releases. Language is part of the product identity and is shown clearly on each listing so you know exactly what you are buying.</p>
<h3>Why are prices different between languages?</h3>
<p>Pricing reflects supply, demand, import cost, and allocation for each language version. Japanese, Korean, and Chinese releases are different products with different markets.</p>

<h2>Returns</h2>
<h3>What if my order arrives damaged?</h3>
<p>Contact us within 7 days of delivery with your order number and clear photos of the packaging and product. Eligible transit or fulfillment damage is handled with a replacement or refund when possible.</p>
<h3>Can I return sealed products?</h3>
<p>Opened products cannot be returned unless required by law or approved by Swift TCG in writing. Factory-sealed returns are limited and require approval before anything is sent back. See our <a href="/policies/refund-policy">Refund Policy</a>.</p>
<h3>What if I received the wrong item?</h3>
<p>Email us within 7 days of delivery with your order number and photos of what you received. We will correct eligible fulfillment errors.</p>
`.trim(),
  },
  {
    handle: "preorder-policy",
    title: "Preorder Policy",
    body: `
<p>Preorders let you reserve upcoming Japanese and other Asian TCG releases before they arrive in California. This page explains how payment, timing, delays, and cancellations work.</p>

<blockquote><p><strong>Important:</strong> Release dates come from manufacturers and suppliers. Dates may change. Preorders ship after inventory arrives in California and is processed — not on a guaranteed calendar date.</p></blockquote>

<h2>How Preorders Work</h2>
<p>When you place a preorder, you reserve an allocation against expected supply for that release. Your order is held until we receive the product, complete intake, and prepare fulfillment.</p>
<p>Estimated timing on the product page reflects the best information available at listing time. It is an estimate, not a guaranteed ship-by date.</p>

<h2>Payment Timing</h2>
<p>Preorders are paid in full at checkout. Payment reserves your allocation for that release.</p>
<blockquote><p><strong>Note:</strong> Because payment secures supply against Japanese allocations, preorder cancellations are limited after checkout.</p></blockquote>

<h2>Release Date Changes</h2>
<p>Manufacturer street dates and supplier ETA updates can move. When estimates change, we update product messaging when we can and fulfill after the product arrives and clears our process.</p>
<p>A changed release date alone does not cancel your preorder.</p>

<h2>Supplier Delays</h2>
<p>If Bandai, The Pokémon Company, or a supplier delays a release, your order remains reserved. We communicate significant confirmed delays by email when we have reliable updates.</p>
<p>We do not invent new dates to fill gaps. When timing is uncertain, we wait for confirmed information before promising a new window.</p>

<h2>Partial Fulfillment</h2>
<p>If supply is short of expected allocation, we may fulfill what we receive and refund any quantity we cannot supply. We will not substitute a different product unless you agree in writing.</p>

<h2>Combined Orders</h2>
<p>In-stock and preorder items can appear in the same checkout, but they may ship in separate packages on different timelines. Cart messaging explains how your specific order will be fulfilled.</p>
<p>In-stock items are not held indefinitely for a later preorder unless checkout messaging says otherwise.</p>

<h2>Cancellation Requests</h2>
<p>Because allocations are reserved against Japanese supply, preorder cancellations are limited. Contact us as soon as possible with your order number if you need to change an order.</p>
<p>We help when inventory status and supplier terms allow. Once a release is in transit to us, received, or in packing, cancellation is usually not available.</p>

<h2>Allocation Changes</h2>
<p>Supplier allocations can be reduced after orders open. If your quantity cannot be fulfilled, we refund the unavailable portion and keep any quantity we can still supply, unless you ask us to cancel the remainder when that option is available.</p>
`.trim(),
  },
  {
    handle: "contact",
    title: "Contact",
    body: `
<p>Questions about an order, a release, or wholesale supply? Send us a note and we will get back to you.</p>
<p>Include your order number when you have one — that helps us respond faster.</p>
`.trim(),
  },
]

const POLICIES: Array<{
  type: "REFUND_POLICY" | "SHIPPING_POLICY" | "TERMS_OF_SERVICE"
  body: string
}> = [
  {
    type: "SHIPPING_POLICY",
    body: `
<p>Swift TCG ships authentic Japanese and other Asian TCG products from California. This policy covers processing, tracking, domestic and international delivery, and what happens when something goes wrong in transit.</p>

<blockquote><p><strong>Important:</strong> Delivery estimates are not guarantees. Carrier timing can vary by destination, weather, peak volume, and customs.</p></blockquote>

<h2>Processing Times</h2>
<p>In-stock orders are typically processed within a few business days after payment clears. Processing means picking, packing, and handing the package to the carrier.</p>
<p>Preorders are processed after the release arrives from Japan (or another import origin), clears intake, and is ready to ship. Product pages show estimated timing when available.</p>

<h2>Shipping Methods</h2>
<p>Available shipping methods and rates are shown at checkout based on destination and package details. Methods may change as carriers and service options update.</p>
<p>We do not promise a specific number of transit days beyond what checkout and the carrier provide as an estimate.</p>

<h2>Tracking Information</h2>
<p>When your order ships, you receive a tracking email. Tracking may take a short time to activate after the label is created.</p>
<p>If tracking has not updated for several business days after activation, contact us with your order number and we will look into it with the carrier.</p>

<h2>Domestic Shipping</h2>
<p>U.S. orders ship from California. Transit time depends on the method selected and your location. Remote or Alaska/Hawaii destinations may take longer.</p>

<h2>International Shipping</h2>
<p>International shipping is available only when offered at checkout for your address. Not every product or destination is eligible for international delivery.</p>
<blockquote><p><strong>Note:</strong> International transit and customs clearance times vary widely. Estimates at checkout are approximate.</p></blockquote>

<h2>Customs &amp; Duties</h2>
<p>For international orders, duties, taxes, and customs fees may be charged by your country. Unless stated otherwise at checkout, those charges are the buyer’s responsibility.</p>
<p>Swift TCG cannot mark packages as gifts or under-declare value.</p>

<h2>Delivery Delays</h2>
<p>Delays can happen after a package leaves our warehouse due to carrier backlog, weather, peak seasons, address issues, or customs holds. When we have useful carrier updates, we share them.</p>
<p>A delay alone does not mean the package is lost. Check tracking first, then contact us if movement has stopped for an extended period.</p>

<h2>Incorrect Addresses</h2>
<p>Orders ship to the address provided at checkout. Please double-check spelling, unit numbers, and postal codes before placing your order.</p>
<p>If you notice an address error before the order ships, contact us immediately with your order number. Once a package is in transit, address changes depend on the carrier and are not always possible. Costs from failed delivery due to an incorrect address may be the buyer’s responsibility.</p>

<h2>Lost Packages</h2>
<p>If tracking shows no movement for an extended period, or the carrier marks a package as lost, contact us with your order number. We will open a carrier investigation when appropriate.</p>
<p>Resolution may include replacement or refund for eligible lost shipments after the carrier process completes. Outcomes depend on carrier findings and order details.</p>
`.trim(),
  },
  {
    type: "REFUND_POLICY",
    body: `
<p>We want your order to arrive as described — authentic, correctly fulfilled, and factory sealed when the listing says so. This policy explains what can be returned, what cannot, and how refunds are handled.</p>

<blockquote><p><strong>Important:</strong> Opened products cannot be returned unless required by law or approved by Swift TCG in writing before anything is sent back.</p></blockquote>

<h2>Eligible Returns</h2>
<p>Eligible cases typically include:</p>
<ul>
<li>Items damaged in transit when reported promptly with photos</li>
<li>Wrong items sent due to a fulfillment error</li>
<li>Factory-sealed returns that Swift TCG has approved in writing before shipment back to us</li>
</ul>
<p>Approval is required before returning anything. Unauthorized returns may be refused.</p>

<h2>Non-returnable Items</h2>
<p>The following are generally not eligible for return or refund:</p>
<ul>
<li>Opened, unsealed, or resealed products</li>
<li>Products returned without prior written approval</li>
<li>Orders damaged after delivery due to mishandling by the recipient</li>
<li>Change-of-mind returns on allocated or limited releases, unless we approve an exception</li>
</ul>

<h2>Factory-Sealed Products</h2>
<p>Factory-sealed listings are sold sealed as received. Once a seal is broken, the item is generally non-returnable.</p>
<p>If we authorize a sealed return, the product must come back unopened, in original condition, with all packaging intact. We may refuse returns that arrive opened, damaged, or incomplete.</p>

<h2>Damaged or Incorrect Orders</h2>
<p>If your package arrives damaged or you received the wrong item, contact us within 7 days of delivery. Include:</p>
<ul>
<li>Your order number</li>
<li>Photos of the outer packaging</li>
<li>Photos of the product and any damage or incorrect item</li>
</ul>
<p>Eligible transit damage and fulfillment errors are handled with replacement or refund when inventory and circumstances allow.</p>

<h2>Return Time Window</h2>
<p>Report damaged or incorrect orders within 7 days of delivery. Requests made after that window may not be eligible.</p>
<p>Approved sealed returns must be shipped back by the deadline we provide in writing.</p>

<h2>Refund Processing</h2>
<p>Approved refunds are issued to the original payment method. Processing time depends on the payment provider and your bank; it often takes several business days after we issue the refund.</p>
<p>Shipping fees may be refundable for eligible fulfillment errors. Buyer-requested returns, when approved, may exclude original outbound shipping unless we state otherwise.</p>

<h2>Exchanges</h2>
<p>We do not offer open exchanges for a different product. For eligible damage or incorrect items, we replace the same product when stock allows, or refund if replacement is not available.</p>

<h2>Contacting Support</h2>
<p>Email us through the <a href="/pages/contact">Contact</a> page with your order number and a clear description of the issue. Photos speed up damaged and incorrect-item requests.</p>
<p>Preorder payment, delay, and allocation questions are covered in our <a href="/pages/preorder-policy">Preorder Policy</a>.</p>
`.trim(),
  },
  {
    type: "TERMS_OF_SERVICE",
    body: `
<p>By placing an order with Swift TCG, you agree to these terms.</p>
<h2>Products</h2>
<p>We sell authentic Japanese trading card products. Descriptions, images, and availability are provided in good faith and may change as supplier information updates.</p>
<h2>Orders</h2>
<p>An order is an offer to purchase. We may cancel or adjust orders in cases of pricing error, allocation limits, suspected fraud, or supply failure.</p>
<h2>Pricing</h2>
<p>Prices are shown in the storefront currency at checkout and may change without notice for future orders.</p>
<h2>Limitation of liability</h2>
<p>To the fullest extent permitted by law, Swift TCG is not liable for indirect or consequential damages arising from use of the store or products.</p>
`.trim(),
  },
]

const METAFIELD_DEFINITIONS: Array<{
  name: string
  key: string
  type: string
  description: string
}> = [
  {
    name: "Business email",
    key: "business_email",
    type: "single_line_text_field",
    description: "Customer-facing support email for Contact + storefront.",
  },
  {
    name: "Response time",
    key: "response_time",
    type: "single_line_text_field",
    description: "Expected reply window shown on the Contact page.",
  },
  {
    name: "Instagram URL",
    key: "instagram_url",
    type: "url",
    description: "Footer / Contact Instagram link.",
  },
  {
    name: "X URL",
    key: "x_url",
    type: "url",
    description: "Footer / Contact X (Twitter) link.",
  },
  {
    name: "Discord URL",
    key: "discord_url",
    type: "url",
    description: "Optional Discord invite URL.",
  },
  {
    name: "YouTube URL",
    key: "youtube_url",
    type: "url",
    description: "Optional YouTube channel URL.",
  },
]

async function listPagesByHandles(
  handles: string[]
): Promise<Map<string, PageNode>> {
  const data = await shopifyAdminFetch<{
    pages: { nodes: PageNode[] }
  }>({
    query: /* GraphQL */ `
      query ListPages($query: String!) {
        pages(first: 50, query: $query) {
          nodes {
            id
            handle
            title
          }
        }
      }
    `,
    variables: {
      query: handles.map((handle) => `handle:${handle}`).join(" OR "),
    },
  })

  const map = new Map<string, PageNode>()
  for (const node of data.pages.nodes) {
    map.set(node.handle, node)
  }
  return map
}

async function createPage(page: {
  handle: string
  title: string
  body: string
}): Promise<void> {
  if (DRY_RUN) {
    console.log(`  [DRY_RUN] Would create page: ${page.handle}`)
    return
  }

  const data = await shopifyAdminFetch<{
    pageCreate: { page: PageNode | null; userErrors: UserError[] }
  }>({
    query: /* GraphQL */ `
      mutation CreatePage($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page {
            id
            handle
            title
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: {
      page: {
        title: page.title,
        handle: page.handle,
        body: page.body,
        isPublished: true,
      },
    },
  })

  const errors = data.pageCreate.userErrors
  if (errors.length) {
    throw new ShopifyClientError(
      `pageCreate(${page.handle}): ${errors.map((e) => e.message).join("; ")}`
    )
  }

  console.log(`  Created page: ${data.pageCreate.page?.handle}`)
}

async function updatePage(
  id: string,
  page: { handle: string; title: string; body: string },
  overwriteBody: boolean
): Promise<void> {
  if (!overwriteBody) {
    console.log(`  Page exists (left unchanged): ${page.handle}`)
    return
  }

  if (DRY_RUN) {
    console.log(`  [DRY_RUN] Would update page: ${page.handle}`)
    return
  }

  const data = await shopifyAdminFetch<{
    pageUpdate: { page: PageNode | null; userErrors: UserError[] }
  }>({
    query: /* GraphQL */ `
      mutation UpdatePage($id: ID!, $page: PageUpdateInput!) {
        pageUpdate(id: $id, page: $page) {
          page {
            id
            handle
            title
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: {
      id,
      page: {
        title: page.title,
        body: page.body,
        isPublished: true,
      },
    },
  })

  const errors = data.pageUpdate.userErrors
  if (errors.length) {
    throw new ShopifyClientError(
      `pageUpdate(${page.handle}): ${errors.map((e) => e.message).join("; ")}`
    )
  }

  console.log(`  Updated page: ${page.handle}`)
}

async function ensurePolicies(): Promise<void> {
  console.log("Policies:")
  for (const policy of POLICIES) {
    if (DRY_RUN) {
      console.log(`  [DRY_RUN] Would upsert policy: ${policy.type}`)
      continue
    }

    const data = await shopifyAdminFetch<{
      shopPolicyUpdate: {
        shopPolicy: { type: string; title: string; url: string } | null
        userErrors: UserError[]
      }
    }>({
      query: /* GraphQL */ `
        mutation UpdatePolicy($shopPolicy: ShopPolicyInput!) {
          shopPolicyUpdate(shopPolicy: $shopPolicy) {
            shopPolicy {
              type
              title
              url
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        shopPolicy: {
          type: policy.type,
          body: policy.body,
        },
      },
    })

    const errors = data.shopPolicyUpdate.userErrors
    if (errors.length) {
      throw new ShopifyClientError(
        `shopPolicyUpdate(${policy.type}): ${errors
          .map((e) => e.message)
          .join("; ")}`
      )
    }

    const saved = data.shopPolicyUpdate.shopPolicy
    console.log(`  Upserted ${policy.type}: ${saved?.title}`)
  }
}

async function ensureMetafieldDefinitions(): Promise<void> {
  console.log("Metafield definitions (Shop / swift):")

  for (const def of METAFIELD_DEFINITIONS) {
    if (DRY_RUN) {
      console.log(`  [DRY_RUN] Would ensure definition: swift.${def.key}`)
      continue
    }

    const data = await shopifyAdminFetch<{
      metafieldDefinitionCreate: {
        createdDefinition: { id: string; key: string } | null
        userErrors: UserError[]
      }
    }>({
      query: /* GraphQL */ `
        mutation CreateShopMetafieldDefinition(
          $definition: MetafieldDefinitionInput!
        ) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
              id
              key
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `,
      variables: {
        definition: {
          name: def.name,
          namespace: "swift",
          key: def.key,
          description: def.description,
          type: def.type,
          ownerType: "SHOP",
          access: {
            storefront: "PUBLIC_READ",
          },
        },
      },
    })

    const errors = data.metafieldDefinitionCreate.userErrors
    if (errors.length) {
      const taken = errors.some((error) =>
        /taken|already|exists/i.test(error.message)
      )
      if (taken) {
        console.log(`  Already exists: swift.${def.key}`)
        continue
      }
      throw new ShopifyClientError(
        `metafieldDefinitionCreate(${def.key}): ${errors
          .map((e) => e.message)
          .join("; ")}`
      )
    }

    console.log(`  Created definition: swift.${def.key}`)
  }
}

async function ensureShopMetafieldValues(): Promise<void> {
  console.log("Shop metafield values:")

  const shopData = await shopifyAdminFetch<{ shop: { id: string } }>({
    query: /* GraphQL */ `
      query ShopId {
        shop {
          id
        }
      }
    `,
  })

  const ownerId = shopData.shop.id
  const values = [
    {
      key: "business_email",
      type: "single_line_text_field",
      value: "hello@swifttcg.com",
    },
    {
      key: "response_time",
      type: "single_line_text_field",
      value: "Within 1–2 business days",
    },
  ]

  if (DRY_RUN) {
    for (const field of values) {
      console.log(`  [DRY_RUN] Would set swift.${field.key} = ${field.value}`)
    }
    console.log("  (Social URLs left unset — add real links in Shopify Admin)")
    return
  }

  const data = await shopifyAdminFetch<{
    metafieldsSet: {
      metafields: Array<{ key: string; value: string }> | null
      userErrors: UserError[]
    }
  }>({
    query: /* GraphQL */ `
      mutation SetShopMetafields($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            value
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    variables: {
      metafields: values.map((field) => ({
        ownerId,
        namespace: "swift",
        key: field.key,
        type: field.type,
        value: field.value,
      })),
    },
  })

  const errors = data.metafieldsSet.userErrors
  if (errors.length) {
    throw new ShopifyClientError(
      `metafieldsSet: ${errors.map((e) => e.message).join("; ")}`
    )
  }

  for (const field of data.metafieldsSet.metafields ?? []) {
    console.log(`  Set swift.${field.key} = ${field.value}`)
  }
  console.log("  Social URLs left unset — add real links in Shopify Admin")
}

async function ensurePages(): Promise<void> {
  console.log("Pages:")
  const existing = await listPagesByHandles(PAGES.map((page) => page.handle))
  const overwriteContact =
    process.argv.includes("--overwrite-contact") ||
    process.env.SEED_OVERWRITE_CONTACT === "1"
  const overwritePages =
    process.argv.includes("--overwrite-pages") ||
    process.env.SEED_OVERWRITE_PAGES === "1"

  for (const page of PAGES) {
    const found = existing.get(page.handle)
    if (found) {
      const shouldOverwrite =
        page.handle === "contact" ? overwriteContact : overwritePages
      await updatePage(found.id, page, shouldOverwrite)
      continue
    }
    await createPage(page)
  }
}

async function main(): Promise<void> {
  loadEnvFile(".env.local")
  loadEnvFile(".env")

  const config = getShopifyAdminConfig()
  console.log(
    `Seeding content on ${config.storeDomain} (API ${config.apiVersion})${
      DRY_RUN ? " [DRY RUN]" : ""
    }...`
  )

  await ensurePages()
  await ensurePolicies()
  await ensureMetafieldDefinitions()
  await ensureShopMetafieldValues()

  console.log("\nDone. Re-check with: npm run shopify:test-content")
  console.log(
    "Edit copy anytime in Shopify Admin → Pages / Settings → Policies / Custom data."
  )
  console.log(
    "Re-seed page bodies with: npm run shopify:seed-content -- --overwrite-pages"
  )
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`seed-shopify-content failed: ${message}`)
  if (/Access denied|access scope/i.test(message)) {
    console.error(
      "\nAdd Admin scopes on the Dev Dashboard app, then reinstall/update on the store:\n" +
        "  write_content (or write_online_store_pages)\n" +
        "  write_legal_policies\n" +
        "  write_products (metafields) / metafield definition write as required\n"
    )
  }
  process.exitCode = 1
})
