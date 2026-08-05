/**
 * Catalog data layer
 *
 * Temporary JSON-backed product access. Replace these helpers with Shopify
 * Storefront API queries later — call sites should keep importing from here.
 */

export {
  CatalogRepository,
  catalogRepository,
  normalizeProduct,
} from "./CatalogRepository"
export { getProducts } from "./getProducts"
export { getProductBySlug } from "./getProductBySlug"
export { getRelatedProducts } from "./getRelatedProducts"
export {
  getProductDescription,
  type ProductDescription,
} from "./getProductDescription"
