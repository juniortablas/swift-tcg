/**
 * Storefront home route
 *
 * Lives under the `(store)` route group so commerce pages can share
 * layout and data conventions without affecting the URL path.
 *
 * Future: fetch featured products / collections via `@/lib/shopify`
 * once the Storefront API client is connected.
 */
import AnnouncementBar from "@/components/layout/AnnouncementBar"
import Navbar from "@/components/layout/Navbar"
import Hero from "@/components/home/Hero"
import ProductCarousel from "@/components/home/ProductCarousel"
import TrustSection from "@/components/home/TrustSection"
import { getProducts } from "@/lib/catalog"

export default function Home() {
  const products = getProducts("pokemon").slice(0, 5)

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <Hero />
      <ProductCarousel products={products} />
      <TrustSection />
    </>
  )
}
