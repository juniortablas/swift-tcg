"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import ProductCard from "@/components/catalog/ProductCard"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

type SortOption = "newest" | "alphabetical"

type ProductGridProps = {
  products: Product[]
}

function sortProducts(products: Product[], sort: SortOption): Product[] {
  if (sort === "alphabetical") {
    return [...products].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    )
  }

  // Catalog JSON is already newest-first from the SORA import.
  return products
}

function filterProducts(products: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) return products

  return products.filter((product) =>
    [product.title, product.slug, product.category]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(q))
  )
}

export default function ProductGrid({ products }: ProductGridProps) {
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortOption>("newest")

  const visible = useMemo(() => {
    return sortProducts(filterProducts(products, query), sort)
  }, [products, query, sort])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search products</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/35"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this collection…"
            className="h-10 w-full rounded-full border border-black/10 bg-white pr-4 pl-10 text-sm text-black outline-none transition-colors placeholder:text-black/35 focus:border-black/20 focus:ring-2 focus:ring-green-600/15"
          />
        </label>

        <div
          className="flex items-center gap-1 rounded-full border border-black/10 bg-neutral-50 p-1"
          role="group"
          aria-label="Sort products"
        >
          {(
            [
              { value: "newest", label: "Newest" },
              { value: "alphabetical", label: "A–Z" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSort(option.value)}
              aria-pressed={sort === option.value}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                sort === option.value
                  ? "bg-white text-black shadow-sm"
                  : "text-black/50 hover:text-black"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/10 bg-neutral-50/60 px-6 py-20 text-center">
          <p className="text-base font-medium tracking-tight text-black">
            No products found.
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-black/50">
            Try a different search term or clear the filter to see the full
            collection.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((product) => (
            <ProductCard
              key={`${product.category}-${product.id}`}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  )
}
