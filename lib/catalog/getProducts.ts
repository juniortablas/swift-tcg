import type { CatalogCategory, Product } from "@/types/product"
import onepiece from "@/data/onepiece.json"
import pokemon from "@/data/pokemon.json"

type RawProduct = Partial<Product> & {
  id: string
  title: string
  category: string
  image: string
}

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
    ...(raw.isNew !== undefined ? { isNew: raw.isNew } : {}),
  }
}

/**
 * Load all products for a catalog category.
 * JSON access is intentionally confined to this module.
 */
export function getProducts(category: CatalogCategory): Product[] {
  return (catalogs[category] ?? []).map(normalizeProduct)
}
