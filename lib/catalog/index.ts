/**
 * Catalog helpers for storefront presentation.
 *
 * Product data is loaded from Shopify (`@/lib/shopify`). This module exports
 * derived UI helpers (descriptions, filters, collection page config) that
 * operate on the shared `Product` model.
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
  getTypeFilterLabel,
  getAvailability,
  getReleaseYear,
  getPurchaseCtaLabel,
  isProductTypeLabel,
  isPurchasable,
  type AvailabilityFilter,
  type ProductTypeFilter,
  type PurchaseCtaVariant,
} from "./productMeta"
export {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  filterProducts,
  getAvailableTypes,
  getAvailableYears,
  getPriceBounds,
  searchProducts,
  sortProducts,
  type CollectionFiltersState,
  type SortOption,
} from "./collectionFilters"
