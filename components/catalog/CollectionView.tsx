import ProductGrid from "@/components/catalog/ProductGrid"
import type { Product } from "@/types/product"

type CollectionViewProps = {
  title: string
  description?: string
  products: Product[]
}

export default function CollectionView({
  title,
  description,
  products,
}: CollectionViewProps) {
  const count = products.length

  return (
    <main className="bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <header className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl lg:text-5xl lg:leading-[1.1]">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 text-base leading-relaxed text-black/55 sm:text-lg">
              {description}
            </p>
          ) : null}
          <p className="mt-3 text-sm font-medium text-black/40">
            {count} {count === 1 ? "product" : "products"}
          </p>
        </header>

        <div className="mt-10 sm:mt-12">
          <ProductGrid products={products} />
        </div>
      </div>
    </main>
  )
}
