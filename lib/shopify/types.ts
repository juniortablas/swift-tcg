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
  /** ISO-8601 datetime from Shopify. */
  createdAt: string
  /** Official release date metafield (`custom.release_date`), YYYY-MM-DD when set. */
  releaseDate: ShopifyMetafieldValue
  featuredImage: Image | null
  priceRange: {
    minVariantPrice: Money
  }
  variants: {
    edges: Array<{
      node: Variant
    }>
  }
}

export interface Collection {
  id: string
  handle: string
  title: string
  description: string
  image: Image | null
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

export type ShopContentQueryResult = {
  shop: {
    name: string
    privacyPolicy: ShopifyShopPolicy
    refundPolicy: ShopifyShopPolicy
    shippingPolicy: ShopifyShopPolicy
    termsOfService: ShopifyShopPolicy
  } & ShopifyContentMetafields
}

/** Metaobject field from the Storefront API. */
export type ShopifyMetaobjectField = {
  key: string
  value: string
  reference: {
    image?: Image | null
  } | null
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
