import Image from "next/image"
import Link from "next/link"
import { Check, ChevronRight } from "lucide-react"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  getProductBySlug,
  getProductDescription,
  getRelatedProducts,
} from "@/lib/catalog"
import { formatUsdPrice } from "@/lib/pricing"
import type { CatalogCategory, Product } from "@/types/product"

const CATALOG_CATEGORIES: CatalogCategory[] = ["pokemon", "onepiece"]

type PageProps = {
  params: Promise<{ slug: string }>
}

function findProductAcrossCatalogs(slug: string): {
  product: Product
  category: CatalogCategory
} | null {
  for (const category of CATALOG_CATEGORIES) {
    const product = getProductBySlug(category, slug)
    if (product) return { product, category }
  }
  return null
}

function RelatedProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100/80 p-5 sm:p-6">
        {product.isNew ? (
          <span className="absolute top-3 left-3 z-10 rounded-md bg-black px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
            New
          </span>
        ) : null}

        <Image
          src={product.image}
          alt={product.title}
          width={200}
          height={260}
          unoptimized
          className="h-auto max-h-full w-full max-w-[160px] object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-[1.03] sm:max-w-[180px]"
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pt-4 pb-5 sm:px-5 sm:pb-6">
        <p className="text-[11px] font-medium tracking-[0.08em] text-black/40 uppercase">
          {product.category}
        </p>
        <h3 className="mt-1.5 text-sm font-semibold tracking-tight text-black sm:text-[15px]">
          {product.title}
        </h3>
        <p className="mt-2 text-sm font-semibold text-black">
          {formatUsdPrice(product.price)}
        </p>
      </div>
    </Link>
  )
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const match = findProductAcrossCatalogs(slug)

  if (!match) {
    notFound()
  }

  const { product, category } = match
  const related = getRelatedProducts(category, product.slug, 4)
  const { shortDescription, description, highlights } =
    getProductDescription(product)

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-12 sm:pt-10 sm:pb-16 lg:pb-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-black/45 sm:mb-10"
        >
          <Link href="/" className="transition-colors hover:text-black">
            Home
          </Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{product.category}</span>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate text-black/70" aria-current="page">
            {product.title}
          </span>
        </nav>

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-black/5 bg-gradient-to-b from-neutral-50 to-neutral-100/80 p-8 sm:p-12">
            <Image
              src={product.image}
              alt={product.title}
              width={520}
              height={680}
              unoptimized
              priority
              className="h-auto max-h-full w-full max-w-md object-contain drop-shadow-lg"
            />
          </div>

          <div className="flex flex-col items-start lg:pt-4">
            <p className="text-xs font-medium tracking-[0.08em] text-black/40 uppercase">
              {product.category}
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-black sm:text-4xl lg:text-5xl lg:leading-[1.1]">
              {product.title}
            </h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-black/55">
              {shortDescription}
            </p>

            <p className="mt-5 text-2xl font-semibold tracking-tight text-black">
              {formatUsdPrice(product.price)}
            </p>

            <Button
              size="lg"
              disabled
              className="mt-8 h-12 rounded-full bg-neutral-100 px-8 text-[15px] font-medium text-black/50"
            >
              Coming Soon
            </Button>

            <ul className="mt-8 space-y-3">
              {highlights.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2.5 text-sm text-black/65"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-600/10 text-green-700">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 max-w-2xl border-t border-black/5 pt-10 sm:mt-16 sm:pt-12">
          <h2 className="text-lg font-semibold tracking-tight text-black sm:text-xl">
            Product Details
          </h2>
          <p className="mt-4 text-base leading-relaxed text-black/55">
            {description}
          </p>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-black/5 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-16 lg:py-20">
            <h2 className="text-xl font-semibold tracking-tight text-black sm:text-2xl">
              Related Products
            </h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-4">
              {related.map((item) => (
                <RelatedProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
