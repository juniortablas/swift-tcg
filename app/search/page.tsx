import type { Metadata } from "next"
import Link from "next/link"

import ProductCard from "@/components/catalog/ProductCard"
import StoreChrome from "@/components/layout/StoreChrome"
import JsonLd from "@/components/seo/JsonLd"
import {
  breadcrumbListJsonLd,
  buildPageMetadata,
  truncateMeta,
} from "@/lib/seo"
import { searchShopifyProducts } from "@/lib/shopify/search"

type PageProps = {
  searchParams: Promise<{ q?: string | string[] }>
}

function queryFromParams(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() || ""
  return value?.trim() || ""
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams
  const q = queryFromParams(params.q)
  const title = q ? `Search results for “${q}”` : "Search"
  const description = q
    ? truncateMeta(`Products matching “${q}” at Swift TCG.`)
    : "Search authentic Japanese Pokémon and One Piece trading cards at Swift TCG."

  return buildPageMetadata({
    title,
    description,
    path: q ? `/search?q=${encodeURIComponent(q)}` : "/search",
    robots: q
      ? { index: true, follow: true }
      : { index: false, follow: true },
  })
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q = queryFromParams(params.q)
  const products = q ? await searchShopifyProducts(q, 24) : []

  return (
    <StoreChrome>
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Search", path: "/search" },
        ])}
      />
      <main className="bg-white">
        <div className="mx-auto max-w-[1920px] px-4 pt-6 pb-10 sm:px-6 sm:pt-10 sm:pb-14 lg:px-8 xl:px-10">
          <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">
            {q ? `Results for “${q}”` : "Search"}
          </h1>
          <p className="mt-2 text-sm text-black/55">
            {q
              ? products.length > 0
                ? `${products.length} product${products.length === 1 ? "" : "s"} found.`
                : "No products matched your search."
              : "Use the search bar in the header to find products."}
          </p>

          {products.length > 0 ? (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} variant="compact" />
                </li>
              ))}
            </ul>
          ) : q ? (
            <p className="mt-8 text-sm text-black/60">
              Try a different term, or browse{" "}
              <Link
                href="/pokemon"
                className="font-medium text-green-700 underline-offset-2 hover:underline"
              >
                Pokémon
              </Link>{" "}
              and{" "}
              <Link
                href="/one-piece"
                className="font-medium text-green-700 underline-offset-2 hover:underline"
              >
                One Piece
              </Link>
              .
            </p>
          ) : null}
        </div>
      </main>
    </StoreChrome>
  )
}
