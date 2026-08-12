import Link from "next/link"
import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { ChevronRight } from "lucide-react"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import StoreChrome from "@/components/layout/StoreChrome"
import ProductCarousel from "@/components/home/ProductCarousel"
import ProductDetails from "@/components/product/ProductDetails"
import ProductGallery from "@/components/product/ProductGallery"
import PurchasePanel from "@/components/product/PurchasePanel"
import {
  RecentlyViewedTracker,
} from "@/components/product/RecentlyViewed"
import ProductJsonLd from "@/components/seo/ProductJsonLd"
import { ProductCardSkeleton } from "@/components/ux/ProductCardSkeleton"
import { Skeleton } from "@/components/ux/Skeleton"
import { getProductImages, getProductSpecs } from "@/lib/catalog"
import { emptyBreakdown } from "@/lib/reviews/constants"
import type { ReviewSummary } from "@/lib/reviews/types"
import { listProductReviews } from "@/lib/reviews/server"
import { buildProductMetadata } from "@/lib/seo"
import { sanitizeShopifyHtml } from "@/lib/shopify"
import {
  getShopifyProductByHandle,
  getShopifyRelatedProducts,
} from "@/lib/shopify/products"
import { getShopPayStoreUrl } from "@/lib/shopify/shopPay"
import type { CatalogCategory, Product } from "@/types/product"

/** ISR fallback — webhooks are the primary invalidation path. */
export const revalidate = 3600

const ProductReviewsSection = dynamic(
  () => import("@/components/reviews/ProductReviewsSection")
)
const RecentlyViewed = dynamic(
  () => import("@/components/product/RecentlyViewed")
)
const Newsletter = dynamic(() => import("@/components/home/Newsletter"))

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getShopifyProductByHandle(slug)
  if (!product) {
    return { title: "Product not found", robots: { index: false, follow: false } }
  }
  return buildProductMetadata(product)
}

async function RelatedRail({
  handle,
  category,
  collection,
}: {
  handle: string
  category: CatalogCategory
  collection: string
}) {
  const related = await getShopifyRelatedProducts({
    handle,
    category,
    limit: 5,
  })
  if (related.length === 0) return null
  return (
    <ProductCarousel
      products={related}
      title="Related Products"
      href={collection}
      linkLabel="View collection"
    />
  )
}

function ReviewsBlock({
  product,
  summary,
}: {
  product: Product
  summary: ReviewSummary
}) {
  // Login hydrates client-side via ReviewsProvider eligibility fetch —
  // do not await cookies here (keeps PDP cacheable).
  return (
    <ProductReviewsSection
      productId={product.id}
      productTitle={product.title}
      productSlug={product.slug}
      productUrl={product.url || `/products/${product.slug}`}
      productImage={product.image}
      initialSummary={summary}
    />
  )
}

async function ProductJsonLdBlock({
  product,
  summary,
  collection,
}: {
  product: Product
  summary: ReviewSummary
  collection: string
}) {
  const reviewSeed =
    summary.count > 0
      ? await listProductReviews({
          productId: product.id,
          page: 1,
          pageSize: 10,
          sort: "newest",
        }).catch(() => null)
      : null

  return (
    <ProductJsonLd
      product={product}
      summary={summary}
      reviews={reviewSeed?.reviews ?? []}
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: product.category, path: collection },
        {
          name: product.title,
          path: product.url || `/products/${product.slug}`,
        },
      ]}
    />
  )
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params

  const product = await getShopifyProductByHandle(slug)
  if (!product) {
    notFound()
  }

  const category = resolveCatalogCategory(product)
  const descriptionHtml = sanitizeShopifyHtml(product.descriptionHtml ?? "")
  const specs = getProductSpecs(product)
  const images = getProductImages(product)
  const collection = collectionHref(category)
  const shopPayStoreUrl = getShopPayStoreUrl()

  // Aggregates from Storefront metafields — no Admin round-trip for cards/summary.
  const summary: ReviewSummary = {
    average: product.reviewRating ?? 0,
    count: product.reviewCount ?? 0,
    breakdown: product.reviewBreakdown ?? emptyBreakdown(),
  }

  return (
    <StoreChrome>
      <RecentlyViewedTracker product={product} />
      <Suspense fallback={null}>
        <ProductJsonLdBlock
          product={product}
          summary={summary}
          collection={collection}
        />
      </Suspense>

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

          {/* Gallery + sticky buy box — critical path, no secondary awaits */}
          <section className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-10 xl:gap-14">
            <div className="min-w-0">
              <ProductGallery
                images={images}
                title={product.imageAlt?.trim() || product.title}
              />
            </div>

            <aside className="mt-4 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
              <PurchasePanel
                product={product}
                shopPayStoreUrl={shopPayStoreUrl}
              />
            </aside>
          </section>

          <section className="mt-6 space-y-5 sm:mt-14 sm:space-y-10 lg:mt-16 lg:space-y-12">
            <ProductDetails
              descriptionHtml={descriptionHtml}
              specs={specs}
              collectionHref={collection}
              collectionLabel={product.category}
            />
            <Suspense
              fallback={
                <div
                  className="space-y-3"
                  aria-busy="true"
                  aria-label="Loading reviews"
                >
                  <span className="sr-only">Loading reviews</span>
                  {Array.from({ length: 2 }, (_, index) => (
                    <div
                      key={index}
                      className="rounded-[17px] border border-black/[0.06] p-4"
                    >
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-3 h-3 w-full" />
                      <Skeleton className="mt-2 h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              }
            >
              <ReviewsBlock product={product} summary={summary} />
            </Suspense>
          </section>
        </div>

        <div className="flex flex-col gap-5 border-t border-black/[0.05] pt-5 pb-6 sm:gap-11 sm:pt-12 sm:pb-12 lg:gap-12 lg:pt-14 lg:pb-14">
          <Suspense
            fallback={
              <div
                className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-10"
                aria-busy="true"
                aria-label="Loading related products"
              >
                <Skeleton className="mb-5 h-7 w-48" />
                <div className="flex gap-2 overflow-hidden sm:gap-4">
                  {Array.from({ length: 5 }, (_, index) => (
                    <div
                      key={index}
                      className="w-[calc((100%-0.5rem)/2.2)] shrink-0 sm:w-[260px] lg:w-[calc((100%-4rem)/5)]"
                    >
                      <ProductCardSkeleton density="rail" />
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <RelatedRail
              handle={product.slug}
              category={category}
              collection={collection}
            />
          </Suspense>

          <Suspense fallback={null}>
            <RecentlyViewed currentId={product.id} />
          </Suspense>
          <Suspense fallback={null}>
            <Newsletter />
          </Suspense>
        </div>
      </main>
    </StoreChrome>
  )
}
