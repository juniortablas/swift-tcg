import type { Product } from "@/types/product"

export type ProductDescription = {
  shortDescription: string
  description: string
  highlights: string[]
}

type ProductLike = Product & {
  releaseDate?: string | null
  contents?: string[] | null
}

function resolveProductType(product: ProductLike): string {
  const category = product.category.toLowerCase()

  if (category.includes("pokémon") || category.includes("pokemon")) {
    return "Pokémon TCG"
  }

  if (category.includes("one piece")) {
    return "One Piece Card Game"
  }

  return product.category
}

/**
 * Build storefront copy from fields already present on the product.
 * Does not invent product-specific facts beyond shared brand statements.
 */
export function getProductDescription(product: ProductLike): ProductDescription {
  const productType = resolveProductType(product)

  const shortDescription = `${product.title} is an authentic Japanese ${productType}, factory sealed and imported from Japan.`

  const description = `${product.title} is an authentic Japanese ${productType} imported directly from Japan. Every product is factory sealed and sourced from trusted distributors. Swift TCG specializes in bringing the newest Japanese Pokémon and One Piece releases to collectors in the United States.`

  const highlights: string[] = [
    "Factory Sealed",
    "Imported from Japan",
    "Ships from California",
  ]

  if (product.releaseDate) {
    highlights.push(`Official Japanese Release: ${product.releaseDate}`)
  }

  if (Array.isArray(product.contents)) {
    for (const item of product.contents) {
      if (typeof item === "string" && item.trim()) {
        highlights.push(item.trim())
      }
    }
  }

  return {
    shortDescription,
    description,
    highlights,
  }
}
