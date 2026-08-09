/**
 * Shopify module barrel
 *
 * Storefront product data is loaded from Shopify and mapped to
 * `@/types/product`. Do not import Shopify types into React components —
 * map through `mappers.ts` first.
 */

export {
  getShopifyConfig,
  shopifyFetch,
  storefrontAuthHeaders,
  isPrivateStorefrontToken,
  ShopifyClientError,
  type ShopifyConfig,
  type ShopifyFetchOptions,
} from "./client"
export {
  GET_PRODUCTS,
  GET_PRODUCT_BY_HANDLE,
  GET_PRODUCT_COLLECTIONS,
  GET_COLLECTIONS,
  GET_COLLECTION_PRODUCTS,
  GET_PAGE_BY_HANDLE,
  GET_SHOP_CONTENT,
  GET_METAOBJECTS_BY_TYPE,
} from "./queries"
export {
  getShopContentSettings,
  getShopifyPageByHandle,
  getShopifyPolicyByHandle,
  CONTENT_PAGE_PATHS,
  POLICY_PATHS,
} from "./content"
export { sanitizeShopifyHtml } from "./sanitizeHtml"
export {
  mapShopifyProduct,
  mapShopifyProducts,
  type MapShopifyProductOptions,
} from "./mappers"
export {
  getShopifyProducts,
  getShopifyProductByHandle,
  getShopifyRelatedProducts,
  type GetShopifyProductsOptions,
  type GetShopifyRelatedProductsOptions,
} from "./products"
export {
  getShopifyComingSoonProducts,
  getShopifyNewestArrivals,
} from "./homepage"
export {
  getStorefrontHero,
  getStorefrontVisual,
  getStorefrontHeroMap,
  getStorefrontVisualMap,
  getHomepageHeroSlides,
  getHomepageCategoryCards,
  applyStorefrontHeroToPresentation,
  resolveVisualImage,
  heroKeyForCollection,
  visualKeyForLanguageFacet,
  visualKeyForHomepageCategory,
  storefrontCmsKeyPrefix,
  STOREFRONT_HERO_TYPE,
  STOREFRONT_VISUAL_TYPE,
  type StorefrontHero,
  type StorefrontVisual,
  type HomepageHeroSlide,
  type HomepageCategoryCard,
} from "./storefrontCms"
export {
  getShopifyCollectionLanguageFacets,
  enrichLanguageFacets,
  productMatchesLanguageFacet,
  type CollectionLanguageFacet,
} from "./collectionFacets"
export {
  discoverPrimaryTcgCollections,
  buildGameFacetsFromProducts,
  buildLanguageFacetsForGame,
  filterProductsByGame,
  filterProductsByLanguage,
  productMatchesGame,
  type BrowseFacet,
  type PrimaryTcgCollection,
} from "./browseHierarchy"
export {
  loadMerchCollectionPage,
  type MerchCollectionKey,
  type MerchCollectionPayload,
} from "./merchPages"
export {
  loadTcgCollectionPage,
  resolveTcgPresentation,
  RESERVED_GAME_HANDLES,
  type TcgCollectionPayload,
} from "./tcgPages"
export { searchShopifyProducts } from "./search"
export {
  CART_CREATE,
  CART_LINES_ADD,
  CART_LINES_UPDATE,
  CART_LINES_REMOVE,
} from "./mutations"
export * from "./customerAccount"
export {
  CART_STATUS_ATTRIBUTE,
  addProductToShopifyCart,
  addShopifyCartLines,
  cartHasMixedConflict,
  clearShopifyCart,
  createShopifyCart,
  emptyCartPayload,
  exceedsAvailableInventory,
  fetchProductForCart,
  fetchShopifyCart,
  mapShopifyCart,
  removeShopifyCartLines,
  resolveMerchandise,
  updateCartLineQuantity,
  updateShopifyCartLines,
  type AddToCartInput,
  type CartFetchOptions,
  type CartOperationError,
  type CartPayload,
} from "./cart"
export { GET_CART, GET_PRODUCT_FOR_CART, CART_FIELDS } from "./cartFields"
export type {
  Money,
  Image,
  Variant,
  Product as ShopifyProduct,
  Collection as ShopifyCollection,
  Edge,
  Connection,
  ProductsQueryResult,
  ProductByHandleQueryResult,
  ProductCollectionsQueryResult,
  CollectionsQueryResult,
  CollectionProductsQueryResult,
  PageByHandleQueryResult,
  ShopContentQueryResult,
  MetaobjectsByTypeQueryResult,
  ShopifyMetaobject,
  ShopifyMetaobjectField,
  ShopifyPage,
  ShopifyShopPolicy,
  ShopifyCart,
  CartLine,
  CartMerchandise,
  CartAttribute,
  CartUserError,
  CartMutationPayload,
  ProductForCart,
  ProductForCartVariant,
} from "./types"
