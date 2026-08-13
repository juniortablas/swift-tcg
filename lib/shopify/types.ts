/**
 * Shopify Storefront API shapes used by the foundation layer.
 *
 * These types stay inside `lib/shopify`. Map to the app `Product` model
 * via `mappers.ts` before anything reaches React components.
 */

export interface Money {
  amount: string
  currencyCode: string
}

export interface Image {
  url: string
  altText: string | null
  width?: number | null
  height?: number | null
}

export interface Variant {
  id: string
  title: string
  availableForSale: boolean
  /** Present when inventory is tracked; null when not tracked. */
  quantityAvailable?: number | null
  price: Money
  image: Image | null
  selectedOptions: Array<{
    name: string
    value: string
  }>
}

/** Cart line attribute (e.g. `_status` for preorder/instock). */
export interface CartAttribute {
  key: string
  value: string
}

export interface CartMerchandise {
  id: string
  availableForSale: boolean
  /** Tracked inventory remaining; null when inventory is not tracked. */
  quantityAvailable?: number | null
  price: Money
  image: Image | null
  product: {
    id: string
    handle: string
    title: string
    tags: string[]
    weeklyRestockLimit?: { value?: string | null } | null
    currentWeeklyReservations?: { value?: string | null } | null
    featuredImage: Image | null
  }
}

export interface CartLine {
  id: string
  quantity: number
  attributes: CartAttribute[]
  merchandise: CartMerchandise
}

export interface ShopifyCart {
  id: string
  checkoutUrl: string
  totalQuantity: number
  attributes?: CartAttribute[]
  cost: {
    subtotalAmount: Money
  }
  lines: {
    edges: Array<{
      node: CartLine
    }>
  }
}

export type CartUserError = {
  field?: string[] | null
  message: string
}

export type CartMutationPayload = {
  cart: ShopifyCart | null
  userErrors: CartUserError[]
}

export type CartCreateResult = {
  cartCreate: CartMutationPayload
}

export type CartLinesAddResult = {
  cartLinesAdd: CartMutationPayload
}

export type CartLinesUpdateResult = {
  cartLinesUpdate: CartMutationPayload
}

export type CartLinesRemoveResult = {
  cartLinesRemove: CartMutationPayload
}

export type CartBuyerIdentityUpdateResult = {
  cartBuyerIdentityUpdate: CartMutationPayload
}

export type CartAttributesUpdateResult = {
  cartAttributesUpdate: CartMutationPayload
}

export type GetCartResult = {
  cart: ShopifyCart | null
}

export type ProductForCartVariant = {
  id: string
  availableForSale: boolean
  quantityAvailable?: number | null
  price: Money
  image: Image | null
}

export type ProductForCart = {
  id: string
  handle: string
  title: string
  tags: string[]
  availableForSale: boolean
  totalInventory?: number | null
  allowWeeklyRestock?: { value?: string | null } | null
  weeklyRestockLimit?: { value?: string | null } | null
  currentWeeklyReservations?: { value?: string | null } | null
  featuredImage: Image | null
  variants: {
    edges: Array<{
      node: ProductForCartVariant
    }>
  }
}

export type GetProductForCartResult = {
  product: ProductForCart | null
}

/** Storefront metafield value (namespace/key aliased in queries). */
export type ShopifyMetafieldValue = {
  value: string
} | null

export interface Product {
  id: string
  handle: string
  title: string
  productType: string
  vendor: string
  tags: string[]
  availableForSale: boolean
  /**
   * Sum of sellable inventory across locations.
   * Requires `unauthenticated_read_product_inventory`; null when untracked.
   */
  totalInventory?: number | null
  /** Paid weekly restock reservation opt-in (`custom.allow_weekly_restock`). */
  allowWeeklyRestock?: ShopifyMetafieldValue
  /** Max reservations while sold out (`custom.weekly_restock_limit`). */
  weeklyRestockLimit?: ShopifyMetafieldValue
  /** Outstanding reservations (`custom.current_weekly_reservations`). */
  currentWeeklyReservations?: ShopifyMetafieldValue
  /** ISO-8601 datetime from Shopify. */
  createdAt: string
  /** Official release date metafield (`custom.release_date`), YYYY-MM-DD when set. */
  releaseDate: ShopifyMetafieldValue
  /** Product body HTML from Shopify Admin (PDP-only queries). */
  descriptionHtml?: string | null
  /** Plain-text description (PDP / SEO). */
  description?: string | null
  /** Shopify Admin SEO fields. */
  seo?: ShopifySeo | null
  /** Language metafield (`custom.language`) — included on catalog + PDP queries. */
  language?: ShopifyMetafieldValue
  /** Aggregate review rating (`swift.review_rating`). */
  reviewRating?: ShopifyMetafieldValue
  /** Aggregate review count (`swift.review_count`). */
  reviewCount?: ShopifyMetafieldValue
  /** Star breakdown JSON (`swift.review_breakdown`). */
  reviewBreakdown?: ShopifyMetafieldValue
  /**
   * Manual homepage Coming Soon rail order (`swift.homepage_position`).
   * Only consumed by `getShopifyComingSoonProducts` — not mapped to app Product.
   */
  homepagePosition?: ShopifyMetafieldValue
  /** PDP-only metafields — present on `getShopifyProductByHandle` only. */
  series?: ShopifyMetafieldValue
  condition?: ShopifyMetafieldValue
  rarity?: ShopifyMetafieldValue
  productCode?: ShopifyMetafieldValue
  featuredImage: Image | null
  /**
   * PDP-only gallery images. Omitted from card/list/CMS queries.
   */
  images?: {
    edges: Array<{
      node: Image
    }>
  }
  priceRange: {
    minVariantPrice: Money
  }
  /**
   * PDP-only. Used for Shop Pay accelerated checkout.
   * Omitted from card/list/CMS queries.
   */
  selectedOrFirstAvailableVariant?: {
    id: string
    availableForSale: boolean
  } | null
  /**
   * Omitted on card/list/CMS queries. Cart uses `GET_PRODUCT_FOR_CART`.
   */
  variants?: {
    edges: Array<{
      node: Variant
    }>
  }
}

export interface Collection {
  id: string
  handle: string
  title: string
  /** Present on SEO/detail queries; omitted from list discovery. */
  description?: string
  descriptionHtml?: string | null
  seo?: ShopifySeo | null
  image: Image | null
  updatedAt?: string | null
}

/** GraphQL connection helpers */

export interface Edge<T> {
  node: T
  cursor?: string
}

export interface Connection<T> {
  edges: Edge<T>[]
  pageInfo?: {
    hasNextPage: boolean
    endCursor?: string | null
  }
}

export interface ProductsQueryResult {
  products: Connection<Product>
}

export interface ProductsByIdsQueryResult {
  nodes: Array<Product | null>
}

export interface ProductByHandleQueryResult {
  product: Product | null
}

export interface ProductCollectionsQueryResult {
  product: {
    id: string
    handle: string
    productType: string
    tags: string[]
    collections: Connection<Pick<Collection, "handle" | "title">>
  } | null
}

export interface CollectionsQueryResult {
  collections: Connection<Collection>
}

export interface CollectionProductsQueryResult {
  collection: (Collection & {
    products: Connection<Product>
  }) | null
}

export type ShopifySeo = {
  title: string | null
  description: string | null
}

export type ShopifyShopPolicy = {
  title: string
  body: string
  handle: string
} | null

export type ShopifyContentMetafields = {
  businessEmail: ShopifyMetafieldValue
  responseTime: ShopifyMetafieldValue
  instagramUrl: ShopifyMetafieldValue
  xUrl: ShopifyMetafieldValue
  discordUrl: ShopifyMetafieldValue
  youtubeUrl: ShopifyMetafieldValue
}

export type ShopifyPage = {
  id: string
  handle: string
  title: string
  body: string
  bodySummary: string
  seo: ShopifySeo
} & ShopifyContentMetafields

export type PageByHandleQueryResult = {
  page: ShopifyPage | null
}

export type ShopChromeQueryResult = {
  shop: {
    name: string
  } & ShopifyContentMetafields
}

export type ShopContentQueryResult = {
  shop: {
    name: string
    privacyPolicy: ShopifyShopPolicy
    refundPolicy: ShopifyShopPolicy
    shippingPolicy: ShopifyShopPolicy
    termsOfService: ShopifyShopPolicy
  } & ShopifyContentMetafields
}

/**
 * Metaobject field `reference` / `references` union from the Storefront API.
 * File fields resolve to MediaImage; homepage merch uses Product / Collection;
 * Homepage orchestration nests Metaobject refs (hero, promotion, featured*).
 */
export type ShopifyMetaobjectReference =
  | {
      __typename: "MediaImage"
      image?: Image | null
    }
  | (Product & { __typename: "Product" })
  | (Collection & { __typename: "Collection" })
  | (ShopifyMetaobject & { __typename: "Metaobject" })

/** Metaobject field from the Storefront API. */
export type ShopifyMetaobjectField = {
  key: string
  value: string
  reference: ShopifyMetaobjectReference | null
  /** Populated for list reference fields (e.g. list.metaobject_reference). */
  references?: Connection<ShopifyMetaobjectReference> | null
}

export type ShopifyMetaobject = {
  id: string
  handle: string
  type: string
  fields: ShopifyMetaobjectField[]
}

export type MetaobjectsByTypeQueryResult = {
  metaobjects: Connection<ShopifyMetaobject>
}
