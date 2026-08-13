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
  GET_COMING_SOON_PRODUCTS,
  GET_COMING_SOON_COLLECTION_PRODUCTS,
  GET_PRODUCT_BY_HANDLE,
  GET_PRODUCT_CARD_BY_HANDLE,
  GET_PRODUCTS_BY_IDS,
  GET_PRODUCT_COLLECTIONS,
  GET_COLLECTIONS,
  GET_COLLECTION_PRODUCTS,
  GET_COLLECTION_FIRST_PRODUCT_IMAGE,
  GET_COLLECTION_BY_HANDLE,
  GET_PRODUCTS_SITEMAP,
  GET_COLLECTIONS_SITEMAP,
  GET_PAGES,
  GET_PAGE_BY_HANDLE,
  GET_SHOP_CHROME,
  GET_SHOP_CONTENT,
  GET_METAOBJECTS_BY_TYPE,
  GET_HOMEPAGE,
} from "./queries"
export {
  getShopChromeSettings,
  getShopContentSettings,
  getShopifyPageByHandle,
  getShopifyPolicyByHandle,
  CONTENT_PAGE_PATHS,
  POLICY_PATHS,
} from "./content"
export {
  getShopifyCollectionByHandle,
  listSitemapProducts,
  listSitemapCollections,
  listSitemapPages,
  type ShopifyCollectionSeo,
  type SitemapProductEntry,
  type SitemapCollectionEntry,
  type SitemapPageEntry,
} from "./collectionSeo"
export { sanitizeShopifyHtml } from "./sanitizeHtml"
export {
  mapShopifyProduct,
  mapShopifyProducts,
  type MapShopifyProductOptions,
} from "./mappers"
export {
  getShopifyProducts,
  getShopifyProductByHandle,
  getShopifyProductsByIds,
  getShopifyRelatedProducts,
  type GetShopifyProductsOptions,
  type GetShopifyRelatedProductsOptions,
} from "./products"
export {
  getShopifyComingSoonProducts,
  getShopifyNewestArrivals,
  getHomepageFeaturedProducts,
  getHomepageFeaturedCollections,
  getHomepagePageData,
  type HomepageFeaturedProductsResult,
  type HomepagePageData,
} from "./homepage"
export {
  getHomepageActivePromotion,
  getHomepageConfig,
  getHomepageFeaturedProductEntries,
  getHomepageFeaturedCollectionEntries,
  HOMEPAGE_TYPE,
  HOMEPAGE_FEATURED_PRODUCT_TYPE,
  HOMEPAGE_FEATURED_COLLECTION_TYPE,
  HOMEPAGE_PROMOTION_TYPE,
  type HomepageFeaturedProductEntry,
  type HomepagePromotion,
  type HomepageConfig,
} from "./homepageMerchandising"
export {
  getStorefrontHero,
  getStorefrontVisual,
  getStorefrontHeroMap,
  getStorefrontVisualMap,
  getHomepageHeroSlides,
  getHomepageCategoryCards,
  homepageHeroSlideFromHero,
  storefrontHeroFromMetaobject,
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
  getAllShopifyCollections,
  resolveCollectionImage,
} from "./collections"
export {
  STOREFRONT_CMS_METAOBJECT_TYPES,
  storefrontCmsWebhookFilter,
  isStorefrontCmsMetaobjectType,
  type StorefrontCmsMetaobjectType,
} from "./cmsMetaobjectTypes"
export {
  catalogFetchOptions,
  cmsFetchOptions,
  chromeFetchOptions,
  policyFetchOptions,
  SHOPIFY_CATALOG_REVALIDATE,
  SHOPIFY_CMS_REVALIDATE,
  SHOPIFY_CHROME_REVALIDATE,
  SHOPIFY_POLICY_REVALIDATE,
  SHOPIFY_CATALOG_TAGS,
  SHOPIFY_CMS_TAGS,
  SHOPIFY_CHROME_TAGS,
  SHOPIFY_POLICY_TAGS,
} from "./cache"
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
  runPredictiveSearch,
  searchProductsViaPredictive,
  collectionHitUrl,
  pageHitUrl,
} from "./predictiveSearch"
export type {
  PredictiveSearchPayload,
  SearchCollectionHit,
  SearchPageHit,
  SearchQuerySuggestion,
} from "./predictiveSearchTypes"
export {
  CART_CREATE,
  CART_LINES_ADD,
  CART_LINES_UPDATE,
  CART_LINES_REMOVE,
  CART_ATTRIBUTES_UPDATE,
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
  prepareShopifyCheckout,
  removeShopifyCartLines,
  resolveMerchandise,
  updateCartLineQuantities,
  updateCartLineQuantity,
  updateShopifyCartLines,
  type AddToCartInput,
  type CartFetchOptions,
  type CartOperationError,
  type CartPayload,
} from "./cart"
export {
  GET_CART,
  GET_PRODUCT_FOR_CART,
  CART_FIELDS,
  CART_FIELDS_WITH_RESTOCK,
} from "./cartFields"
export {
  formatShopPayVariants,
  getShopPayStoreUrl,
  parseShopPayVariantId,
  shopPayStoreUrlFromDomain,
  SHOP_PAY_SCRIPT_URL,
} from "./shopPay"
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
  ShopifyMetaobjectReference,
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
