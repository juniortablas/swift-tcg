import type { CatalogCategory, Product } from "@/types/product"

import { getProducts } from "./getProducts"

/**
 * Find a single product by slug within a catalog category.
 */
export function getProductBySlug(
  category: CatalogCategory,
  slug: string
): Product | null {
  return getProducts(category).find((product) => product.slug === slug) ?? null
}
