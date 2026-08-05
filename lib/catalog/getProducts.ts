import type { CatalogCategory, Product } from "@/types/product"

import { catalogRepository } from "./CatalogRepository"

export { normalizeProduct } from "./CatalogRepository"

/**
 * Load all products for a catalog category.
 * JSON access is intentionally confined to CatalogRepository.
 */
export function getProducts(category: CatalogCategory): Product[] {
  return catalogRepository.getProducts(category)
}
