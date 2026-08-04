/**
 * Storefront home route
 *
 * Lives under the `(store)` route group so commerce pages can share
 * layout and data conventions without affecting the URL path.
 *
 * Future: fetch featured products / collections via `@/lib/shopify`
 * once the Storefront API client is connected.
 *
 * Temporary: reuses the existing marketing home composition.
 */
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <Hero />
    </>
  );
}
