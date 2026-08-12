/**
 * Storefront home route
 *
 * Lives under the `(store)` route group so commerce pages can share
 * layout and data conventions without affecting the URL path.
 *
 * Homepage sections are orchestrated by a single Shopify Homepage metaobject
 * when present; otherwise catalog + per-type CMS fallbacks apply
 * (see docs/STOREFRONT_CMS.md).
 */
import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { Package } from "lucide-react"
import { Suspense } from "react"

import StoreChrome from "@/components/layout/StoreChrome"
import Hero from "@/components/home/Hero"
import HomePromotion from "@/components/home/HomePromotion"
import ProductCarousel from "@/components/home/ProductCarousel"
import ShopByCategory from "@/components/home/ShopByCategory"
import TrustSection from "@/components/home/TrustSection"
import EmptyState from "@/components/ux/EmptyState"
import { SparklesEmptyIllustration } from "@/components/ux/EmptyIllustrations"
import {
  buildPageMetadata,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
} from "@/lib/seo"
import { getHomepagePageData } from "@/lib/shopify/homepage"

/** ISR fallback — webhooks are the primary invalidation path. */
export const revalidate = 3600

const Newsletter = dynamic(() => import("@/components/home/Newsletter"))

export async function generateMetadata(): Promise<Metadata> {
  const { heroSlides } = await getHomepagePageData(8)
  const hero = heroSlides[0]
  const image = hero?.desktopImage || hero?.mobileImage || null
  const imageAlt = hero?.imageAlt || DEFAULT_TITLE

  return buildPageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    image,
    imageAlt,
    absoluteTitle: true,
  })
}

export default async function Home() {
  const {
    featured,
    newestArrivals,
    heroSlides,
    categoryCards,
    promotion,
    showComingSoon,
    showCategories,
    showLatestReleases,
    showNewsletter,
    featuredProductsTitle,
    featuredCollectionsTitle,
  } = await getHomepagePageData(8)

  const featuredTitle = featured.fromCms
    ? featuredProductsTitle
    : "Coming Soon"
  // Prefer a public catalog URL — there is no `/products` index route.
  const featuredHref = featured.fromCms ? "/new-releases" : "/preorders"
  const featuredLinkLabel = featured.fromCms
    ? "View all"
    : "View all upcoming"

  return (
    <StoreChrome>
      <Hero slides={heroSlides} />
      {/* Consistent section rhythm — dense but cohesive */}
      <div className="flex flex-col gap-4 pt-3 pb-6 sm:gap-11 sm:pt-12 sm:pb-11 lg:gap-12 lg:pt-14 lg:pb-12">
        {showComingSoon ? (
          <div id="preorders">
            <ProductCarousel
              products={featured.products}
              title={featuredTitle}
              href={featuredHref}
              linkLabel={featuredLinkLabel}
              badges={featured.badges}
              emptyState={
                <EmptyState
                  compact
                  illustration={<SparklesEmptyIllustration />}
                  title="Coming soon drops are brewing"
                  description="We're lining up the next wave of Japanese sealed product. Browse preorders or new releases while you wait."
                  actions={[
                    { label: "View preorders", href: "/preorders" },
                    {
                      label: "New releases",
                      href: "/new-releases",
                      variant: "secondary",
                    },
                  ]}
                />
              }
            />
          </div>
        ) : null}
        {showCategories ? (
          <ShopByCategory
            categories={categoryCards}
            title={featuredCollectionsTitle}
          />
        ) : null}
        <HomePromotion promotion={promotion} />
        <TrustSection />
        {showLatestReleases ? (
          <ProductCarousel
            products={newestArrivals}
            title="Newest Arrivals"
            href="/new-releases"
            linkLabel="View all arrivals"
            icon={Package}
          />
        ) : null}
        {showNewsletter ? (
          <Suspense fallback={null}>
            <Newsletter />
          </Suspense>
        ) : null}
      </div>
    </StoreChrome>
  )
}
