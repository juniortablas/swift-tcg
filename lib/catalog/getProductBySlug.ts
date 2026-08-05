import type { CatalogCategory, Product } from "@/types/product"

import { catalogRepository } from "./CatalogRepository"

/**
 * Find a single product by slug within a catalog category.
 */
export function getProductBySlug(
  category: CatalogCategory,
  slug: string
): Product | null {
  return (
    catalogRepository
      .getProducts(category)
      .find((product) => product.slug === slug) ?? null
  )
}
