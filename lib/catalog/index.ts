/**
 * Catalog helpers for storefront presentation.
 *
 * Product data is loaded from Shopify (`@/lib/shopify`). This module exports
 * derived UI helpers (PDP specs from Shopify fields, filters, collection page
 * config) that operate on the shared `Product` model.
 */

export {
  getProductDescription,
  type ProductDescription,
} from "./getProductDescription"
export {
  getProductSpecs,
  getProductImages,
  type ProductSpec,
} from "./getProductSpecs"
export { getProductReleaseDate } from "./homepage"
export { COLLECTIONS, type CollectionConfig, type CollectionId, type CollectionPresentation } from "./collections"
export {
  getProductBrand,
  getProductTypeLabel,
  getProductTypeFilter,
  getShopifyProductType,
  getTypeFilterLabel,
  getAvailability,
  getReleaseYear,
  getProductLanguageSlug,
  getProductLanguageLabel,
  getLanguageFilterLabel,
  getPurchaseCtaLabel,
  getAvailabilityBadge,
  isProductTypeLabel,
  isPurchasable,
  PRODUCT_LANGUAGE_SLUGS,
  SHOPIFY_PRODUCT_TYPES,
  type AvailabilityBadge,
  type AvailabilityBadgeSurface,
  type AvailabilityFilter,
  type ProductLanguageSlug,
  type ProductTypeFilter,
  type PurchaseCtaVariant,
  type ShopifyProductType,
} from "./productMeta"
export {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  PAGE_SIZE,
  filterProducts,
  getAvailableLanguages,
  getAvailableTypes,
  getAvailableYears,
  getPriceBounds,
  hasActiveFilters,
  searchProducts,
  sortProducts,
  type CollectionFiltersState,
  type SortOption,
} from "./collectionFilters"
export {
  collectionUrlSearch,
  collectionUrlStatesEqual,
  parseCollectionUrlState,
  serializeCollectionUrlState,
  type CollectionUrlState,
} from "./collectionUrlState"
