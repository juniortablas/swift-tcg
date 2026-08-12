import Link from "next/link"
import type { Metadata } from "next"
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
import ProductReviewsSection from "@/components/reviews/ProductReviewsSection"
import ProductJsonLd from "@/components/seo/ProductJsonLd"
import { getProductImages, getProductSpecs } from "@/lib/catalog"
import { emptyBreakdown } from "@/lib/reviews/constants"
import { listProductReviews } from "@/lib/reviews/server"
import { buildProductMetadata } from "@/lib/seo"
import { sanitizeShopifyHtml } from "@/lib/shopify"
import { isCustomerLoggedIn } from "@/lib/shopify/customerAccount"
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

  // Aggregates from Storefront metafields — no Admin round-trip for cards/summary.
  const summary = {
    average: product.reviewRating ?? 0,
    count: product.reviewCount ?? 0,
    breakdown: product.reviewBreakdown ?? emptyBreakdown(),
  }

  const [related, loggedIn, reviewSeed] = await Promise.all([
    getShopifyRelatedProducts({
      handle: product.slug,
      category,
      limit: 5,
    }),
    isCustomerLoggedIn().catch(() => false),
    // SEO only: seed individual Review schema when aggregates exist.
    summary.count > 0
      ? listProductReviews({
          productId: product.id,
          page: 1,
          pageSize: 10,
          sort: "newest",
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  return (
    <StoreChrome>
      <RecentlyViewedTracker product={product} />
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
              <ProductGallery
                images={images}
                title={product.imageAlt?.trim() || product.title}
              />
            </div>

            <aside className="mt-4 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
              <PurchasePanel product={product} />
            </aside>
          </section>

          <section className="mt-6 space-y-5 sm:mt-14 sm:space-y-10 lg:mt-16 lg:space-y-12">
            <ProductDetails
              descriptionHtml={descriptionHtml}
              specs={specs}
              collectionHref={collection}
              collectionLabel={product.category}
            />
            <ProductReviewsSection
              productId={product.id}
              productTitle={product.title}
              productSlug={product.slug}
              productUrl={product.url || `/products/${product.slug}`}
              productImage={product.image}
              initialSummary={summary}
              customerLoggedIn={loggedIn}
            />
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
