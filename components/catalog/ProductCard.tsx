import Image from "next/image"
import Link from "next/link"

import { formatUsdPrice } from "@/lib/pricing"
import type { Product } from "@/types/product"

function productHref(product: Product): string {
  if (product.url) return product.url
  if (product.slug) return `/products/${product.slug}`
  return "/products"
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="h-full">
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
            {formatUsdPrice(product.price)}
          </p>
        </div>
      </Link>
    </article>
  )
}
