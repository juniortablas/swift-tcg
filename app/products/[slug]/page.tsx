import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { notFound } from "next/navigation"

import StoreChrome from "@/components/layout/StoreChrome"
import Newsletter from "@/components/home/Newsletter"
import ProductCarousel from "@/components/home/ProductCarousel"
import ProductDetails from "@/components/product/ProductDetails"
import ProductGallery from "@/components/product/ProductGallery"
import PurchasePanel from "@/components/product/PurchasePanel"
import RecentlyViewed, {
  RecentlyViewedTracker,
} from "@/components/product/RecentlyViewed"
import {
  getProductDescription,
  getProductImages,
  getProductSpecs,
} from "@/lib/catalog"
import {
  getShopifyProductByHandle,
  getShopifyRelatedProducts,
} from "@/lib/shopify/products"
import type { CatalogCategory, Product } from "@/types/product"

type PageProps = {
  params: Promise<{ slug: string }>
}

function resolveCatalogCategory(product: Product): CatalogCategory {
  const category = product.category.toLowerCase()
  if (
    category.includes("one piece") ||
    category.includes("onepiece") ||
    category === "one-piece"
  ) {
    return "onepiece"
  }
  return "pokemon"
}

function collectionHref(category: CatalogCategory): string {
  return category === "pokemon" ? "/pokemon" : "/one-piece"
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params

  const product = await getShopifyProductByHandle(slug)
  if (!product) {
    notFound()
  }

  const category = resolveCatalogCategory(product)
  const related = await getShopifyRelatedProducts({
    handle: product.slug,
    category,
    limit: 5,
  })
  const { paragraphs } = getProductDescription(product)
  const specs = getProductSpecs(product)
  const images = getProductImages(product)
  const collection = collectionHref(category)

  return (
    <StoreChrome>
      <RecentlyViewedTracker product={product} />

      <main className="bg-white">
        <div className="mx-auto w-full max-w-[1920px] px-3 pt-3 pb-6 sm:px-6 sm:pt-8 sm:pb-12 lg:px-8 lg:pt-10 lg:pb-14 xl:px-10">
          <nav
            aria-label="Breadcrumb"
            className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-black/45 sm:mb-8 sm:text-sm"
          >
            <Link href="/" className="transition-colors hover:text-black">
              Home
            </Link>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            <Link href={collection} className="transition-colors hover:text-black">
              {product.category}
            </Link>
            <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate text-black/70" aria-current="page">
              {product.title}
            </span>
          </nav>

          {/* Gallery + sticky buy box */}
          <section className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-10 xl:gap-14">
            <div className="min-w-0">
              <ProductGallery images={images} title={product.title} />
            </div>

            <aside className="mt-4 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
              <PurchasePanel product={product} />
            </aside>
          </section>

          <section className="mt-6 space-y-5 sm:mt-14 sm:space-y-10 lg:mt-16 lg:space-y-12">
            <ProductDetails paragraphs={paragraphs} specs={specs} />
          </section>
        </div>

        <div className="flex flex-col gap-5 border-t border-black/[0.05] pt-5 pb-6 sm:gap-11 sm:pt-12 sm:pb-12 lg:gap-12 lg:pt-14 lg:pb-14">
          {related.length > 0 ? (
            <ProductCarousel
              products={related}
              title="Related Products"
              href={collection}
              linkLabel="View collection"
            />
          ) : null}

          <RecentlyViewed currentId={product.id} />
          <Newsletter />
        </div>
      </main>
    </StoreChrome>
  )
}
