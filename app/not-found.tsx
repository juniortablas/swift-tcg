import type { Metadata } from "next"
import Link from "next/link"

import ProductCard from "@/components/catalog/ProductCard"
import StoreChrome from "@/components/layout/StoreChrome"
import BrandLogo from "@/components/brand/BrandLogo"
import { EscapedCardIllustration } from "@/components/ux/EmptyIllustrations"
import { getShopifyNewestArrivals } from "@/lib/shopify/homepage"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
}

const QUICK_LINKS = [
  { label: "Homepage", href: "/" },
  { label: "Pokémon", href: "/pokemon" },
  { label: "One Piece", href: "/one-piece" },
  { label: "New Releases", href: "/new-releases" },
  { label: "Search", href: "/search" },
] as const

export default async function NotFound() {
  const featured = await getShopifyNewestArrivals(5).catch(() => [])

  return (
    <StoreChrome>
      <main className="bg-white">
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,#DCFCE7_0%,transparent_55%)]"
          />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-14 pb-10 text-center sm:px-6 sm:pt-20 sm:pb-14">
            <BrandLogo height={44} />
            <div className="mt-8">
              <EscapedCardIllustration className="h-36 sm:h-44" />
            </div>
            <p className="mt-6 text-xs font-semibold tracking-[0.22em] text-green-700 uppercase">
              404
            </p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-black sm:text-4xl">
              Looks like this card escaped the binder.
            </h1>
            <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-black/55 sm:text-[15px]">
              That page isn&apos;t in our collection. Try one of these paths — or
              search for the set you&apos;re hunting.
            </p>

            <nav
              aria-label="Helpful destinations"
              className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
            >
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-black/[0.1] bg-white px-5 text-sm font-semibold text-black/80 transition-colors hover:border-green-600/30 hover:bg-green-50 hover:text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 focus-visible:ring-offset-2"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {featured.length > 0 ? (
          <section className="border-t border-black/[0.05] px-4 py-10 sm:px-6 sm:py-14 lg:px-8 xl:px-10">
            <div className="mx-auto max-w-[1920px]">
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-xl font-semibold tracking-tight text-black sm:text-2xl">
                  Featured picks
                </h2>
                <Link
                  href="/new-releases"
                  className="text-sm font-medium text-green-700 hover:text-green-800"
                >
                  View all arrivals
                </Link>
              </div>
              <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
                {featured.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} variant="compact" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
    </StoreChrome>
  )
}
