/**
 * Storefront home route
 *
 * Lives under the `(store)` route group so commerce pages can share
 * layout and data conventions without affecting the URL path.
 *
 * Homepage rails are powered by Shopify only.
 * Marketing heroes / category cards come from Storefront Metaobjects
 * with local asset fallbacks (see docs/STOREFRONT_CMS.md).
 */
import { Package } from "lucide-react"

import StoreChrome from "@/components/layout/StoreChrome"
import Hero from "@/components/home/Hero"
import Newsletter from "@/components/home/Newsletter"
import ProductCarousel from "@/components/home/ProductCarousel"
import ShopByCategory from "@/components/home/ShopByCategory"
import TrustSection from "@/components/home/TrustSection"
import {
  getShopifyComingSoonProducts,
  getShopifyNewestArrivals,
} from "@/lib/shopify/homepage"
import {
  getHomepageCategoryCards,
  getHomepageHeroSlides,
} from "@/lib/shopify/storefrontCms"

export default async function Home() {
  const [comingSoon, newestArrivals, heroSlides, categoryCards] =
    await Promise.all([
      getShopifyComingSoonProducts(8),
      getShopifyNewestArrivals(8),
      getHomepageHeroSlides(),
      getHomepageCategoryCards(),
    ])

  return (
    <StoreChrome>
      <Hero slides={heroSlides} />
      {/* Consistent section rhythm — dense but cohesive */}
      <div className="flex flex-col gap-4 pt-3 pb-6 sm:gap-11 sm:pt-12 sm:pb-11 lg:gap-12 lg:pt-14 lg:pb-12">
        <div id="preorders">
          <ProductCarousel
            products={comingSoon}
            title="Coming Soon"
            href="/preorders"
            linkLabel="View all upcoming"
          />
        </div>
        <ShopByCategory categories={categoryCards} />
        <TrustSection />
        <ProductCarousel
          products={newestArrivals}
          title="Newest Arrivals"
          href="/new-releases"
          linkLabel="View all arrivals"
          icon={Package}
        />
        <Newsletter />
      </div>
    </StoreChrome>
  )
}
