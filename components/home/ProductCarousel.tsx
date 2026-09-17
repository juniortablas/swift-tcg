import Link from "next/link"
import { ArrowRight, Sparkles, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import ProductCard from "@/components/catalog/ProductCard"
import CarouselScroller from "@/components/home/CarouselScroller"
import type { Product } from "@/types/product"

interface ProductCarouselProps {
  products: Product[]
  title: string
  href?: string
  linkLabel?: string
  icon?: LucideIcon
  /** Optional CMS merchandising badges keyed by product id. */
  badges?: Record<string, string>
  /** When set, shown instead of hiding the rail for an empty product list. */
  emptyState?: ReactNode
}

export default function ProductCarousel({
  products,
  title,
  href = "/products",
  linkLabel = "View all",
  icon: Icon = Sparkles,
  badges,
  emptyState,
}: ProductCarouselProps) {
  if (products.length === 0) {
    if (!emptyState) return null
    return (
      <section className="bg-white">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-end justify-between gap-3 sm:gap-4">
            <h2 className="flex items-center gap-1.5 text-[1.1rem] font-semibold tracking-tight text-black sm:gap-2.5 sm:text-[1.65rem]">
              <Icon
                className="size-4 text-indigo-600 sm:size-6"
                aria-hidden="true"
              />
              {title}
            </h2>
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 sm:text-sm"
            >
              {linkLabel}
              <ArrowRight className="size-3.5 sm:size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 sm:mt-6">{emptyState}</div>
        </div>
      </section>
    )
  }

  const gapPx = 8

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-end justify-between gap-3 sm:gap-4">
          <h2 className="flex items-center gap-1.5 text-[1.1rem] font-semibold tracking-tight text-black sm:gap-2.5 sm:text-[1.65rem]">
            <Icon
              className="size-4 text-indigo-600 sm:size-6"
              aria-hidden="true"
            />
            {title}
          </h2>

          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 sm:text-sm"
          >
            {linkLabel}
            <ArrowRight className="size-3.5 sm:size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-2 sm:mt-6">
          <CarouselScroller
            label={title}
            gapClassName="gap-2 sm:gap-4"
            gapPx={gapPx}
          >
            {products.map((product) => (
              <div
                key={product.id}
                data-carousel-item
                className="w-[calc((100%-0.5rem)/2.2)] shrink-0 snap-start sm:w-[260px] lg:w-[calc((100%-4rem)/5)]"
              >
                <ProductCard
                  product={product}
                  variant="featured"
                  density="rail"
                  badgeOverride={badges?.[product.id]}
                />
              </div>
            ))}
          </CarouselScroller>
        </div>
      </div>
    </section>
  )
}
