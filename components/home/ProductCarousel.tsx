import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

import type { Product } from "@/types/product"

interface ProductCarouselProps {
  products: Product[]
}

function formatPrice(price: Product["price"] | string): string {
  if (typeof price === "string") return price
  if (typeof price === "number") return `¥${price.toLocaleString("en-US")}`
  return "—"
}

/** Prefer product.url; fall back so Link never receives an empty href. */
function productHref(product: Product): string {
  if (typeof product.url === "string" && product.url.length > 0) {
    return product.url
  }

  if (typeof product.slug === "string" && product.slug.length > 0) {
    return `/products/${product.slug}`
  }

  // Homepage may pass a partial product — derive slug from the image path.
  const fromImage = product.image?.match(/\/products\/([^/]+?)(?:\.[^/]+)?$/)
  if (fromImage?.[1]) {
    return `/products/${fromImage[1]}`
  }

  return "/products"
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-black sm:text-2xl">
            <Sparkles
              className="size-5 text-green-600 sm:size-6"
              aria-hidden="true"
            />
            New This Week
          </h2>

          <Link
            href="/products"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-green-600 transition-colors hover:text-green-700"
          >
            View all new releases
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory md:gap-5 sm:mt-10 lg:grid lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {products.map((product) => (
            <article
              key={product.id}
              className="w-[min(72vw,260px)] shrink-0 snap-start md:w-[calc((100%-2.5rem)/3)] lg:w-auto"
            >
              <Link
                href={productHref(product)}
                className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 focus-visible:ring-offset-2"
              >
                <div className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100/80 p-5 sm:p-6">
                  {product.isNew ? (
                    <span className="absolute top-3 left-3 z-10 rounded-md bg-black px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                      New
                    </span>
                  ) : null}

                  <Image
                    src={product.image}
                    alt=""
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
                    {formatPrice(product.price)}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
