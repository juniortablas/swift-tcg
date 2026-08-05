import type { CatalogCategory, Product } from "@/types/product"
import onepiece from "@/data/onepiece.json"
import pokemon from "@/data/pokemon.json"

type RawProduct = Partial<Product> & {
  id: string
  title: string
  category: string
  image: string
}

const CATALOG_CATEGORIES: CatalogCategory[] = ["pokemon", "onepiece"]

const catalogs: Record<CatalogCategory, RawProduct[]> = {
  pokemon: pokemon as RawProduct[],
  onepiece: onepiece as RawProduct[],
}

/** Derive a slug from `/products/foo.webp` when slug is missing. */
function slugFromImage(image: string): string {
  const match = image.match(/\/products\/([^/]+?)(?:\.[^/]+)?$/)
  return match?.[1] ?? ""
}

/**
 * Guarantee every product has slug + url for routing.
 * Call sites must never receive a product without a usable href.
 */
export function normalizeProduct(raw: RawProduct): Product {
  const slug =
    (typeof raw.slug === "string" && raw.slug) ||
    slugFromImage(raw.image) ||
    raw.id

  const url =
    (typeof raw.url === "string" && raw.url) || `/products/${slug}`

  return {
    id: raw.id,
    slug,
    title: raw.title,
    category: raw.category,
    image: raw.image,
    price: typeof raw.price === "number" ? raw.price : null,
    url,
    status: raw.status ?? "unknown",
    ...(raw.isNew !== undefined ? { isNew: raw.isNew } : {}),
  }
}

/**
 * JSON-backed catalog access. Swap the data source later without changing helpers.
 */
export class CatalogRepository {
  /**
   * Load products for a category, or every catalog when category is omitted.
   */
  getProducts(category?: CatalogCategory): Product[] {
    if (category) {
      return (catalogs[category] ?? []).map(normalizeProduct)
    }

    return CATALOG_CATEGORIES.flatMap((key) => this.getProducts(key))
  }

  /**
   * Find a single product by slug across all catalogs.
   */
  getProductBySlug(slug: string): Product | null {
    return this.getProducts().find((product) => product.slug === slug) ?? null
  }

  /**
   * Related products from the same category, excluding the current slug.
   */
  getRelatedProducts(category: CatalogCategory, slug: string): Product[] {
    return this.getProducts(category).filter((product) => product.slug !== slug)
  }

  /**
   * Search products by title, slug, or category.
   */
  search(query: string): Product[] {
    const q = query.trim().toLowerCase()
    if (!q) return []

    return this.getProducts().filter((product) =>
      [product.title, product.slug, product.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    )
  }
}

export const catalogRepository = new CatalogRepository()
