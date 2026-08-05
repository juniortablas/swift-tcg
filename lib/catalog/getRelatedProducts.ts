import type { CatalogCategory, Product } from "@/types/product"

import { getProducts } from "./getProducts"

/**
 * Related products from the same category, excluding the current slug.
 */
export function getRelatedProducts(
  category: CatalogCategory,
  slug: string,
  limit = 4
): Product[] {
  return getProducts(category)
    .filter((product) => product.slug !== slug)
    .slice(0, limit)
}
