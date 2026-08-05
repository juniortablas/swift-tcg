import type { CatalogCategory, Product } from "@/types/product"

import { catalogRepository } from "./CatalogRepository"

/**
 * Related products from the same category, excluding the current slug.
 */
export function getRelatedProducts(
  category: CatalogCategory,
  slug: string,
  limit = 4
): Product[] {
  return catalogRepository.getRelatedProducts(category, slug).slice(0, limit)
}
