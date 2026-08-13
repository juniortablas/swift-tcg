/**
 * Product-page copy that can later be sourced from CMS without
 * changing presentational components.
 */
export const FINAL_SALE_NOTICE = {
  title: "Final Sale",
  body: "Due to the collectible nature of trading card products, all sales are final. We cannot accept returns or exchanges except for items that arrive damaged or incorrect.",
} as const

export const WEEKLY_RESTOCK_NOTICE = {
  title: "Reserve for Weekly Restock",
  body: "Reserve yours now and we'll ship it as soon as our next weekly inventory arrives.",
  remainingLabel: "Reservations Remaining",
} as const

export const WEEKLY_RESTOCK_PERKS = [
  "Guaranteed reservation",
  "Ships after our next weekly inventory delivery",
  "No need to wait for restock notifications",
] as const

export const WEEKLY_RESTOCK_CART_NOTICE = {
  title: "Reserve Item Notice",
  body: [
    "One or more items in your cart are reserved for our upcoming weekly restock.",
    "Your order will ship as soon as inventory arrives.",
  ],
} as const

export const WEEKLY_RESTOCK_BADGE_LABEL = "Weekly Restock"
export const WEEKLY_RESTOCK_CTA_LABEL = "Reserve Now"
export const WEEKLY_RESTOCK_CTA_CARD_LABEL = "Reserve"
