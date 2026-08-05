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
import pokemonCatalog from "@/data/pokemon.json"
import type { Product } from "@/types/product"

const products: Product[] = pokemonCatalog.slice(0, 5).map((product) => ({
  id: product.id,
  title: product.title,
  category: product.category,
  image: product.image,
  price:
    typeof product.price === "number"
      ? `¥${product.price.toLocaleString("en-US")}`
      : "—",
}))

export default function Home() {
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
