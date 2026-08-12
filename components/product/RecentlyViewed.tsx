"use client"

import { useEffect, useState } from "react"
import { History } from "lucide-react"

import ProductCarousel from "@/components/home/ProductCarousel"
import EmptyState from "@/components/ux/EmptyState"
import { HistoryEmptyIllustration } from "@/components/ux/EmptyIllustrations"
import type { Product } from "@/types/product"

const STORAGE_KEY = "swift-tcg-recently-viewed"
const MAX_ITEMS = 8

function readViewed(): Product[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is Product =>
        !!item &&
        typeof item === "object" &&
        typeof (item as Product).id === "string" &&
        typeof (item as Product).slug === "string" &&
        typeof (item as Product).title === "string" &&
        typeof (item as Product).image === "string"
    )
  } catch {
    return []
  }
}

function writeViewed(products: Product[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products.slice(0, MAX_ITEMS)))
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function trackRecentlyViewed(product: Product) {
  const existing = readViewed().filter((item) => item.id !== product.id)
  writeViewed([product, ...existing])
}

export function RecentlyViewedEmptyState() {
  return (
    <EmptyState
      compact
      illustration={<HistoryEmptyIllustration />}
      title="No recently viewed products"
      description="Products you open will appear here so you can jump back to sets you’re comparing."
      actions={[
        { label: "Continue shopping", href: "/pokemon" },
        {
          label: "New releases",
          href: "/new-releases",
          variant: "secondary",
        },
      ]}
    />
  )
}

export default function RecentlyViewed({
  currentId,
  showEmpty = false,
}: {
  currentId: string
  /** When true, render an empty state instead of hiding the rail. */
  showEmpty?: boolean
}) {
  const [products, setProducts] = useState<Product[] | null>(null)

  useEffect(() => {
    // localStorage is client-only — read after mount to avoid hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration read
    setProducts(
      readViewed().filter((item) => item.id !== currentId).slice(0, 5)
    )
  }, [currentId])

  if (products === null) return null

  if (products.length === 0) {
    if (!showEmpty) return null
    return (
      <ProductCarousel
        products={[]}
        title="Recently Viewed"
        href="/pokemon"
        linkLabel="Continue shopping"
        icon={History}
        emptyState={<RecentlyViewedEmptyState />}
      />
    )
  }

  return (
    <ProductCarousel
      products={products}
      title="Recently Viewed"
      href="/pokemon"
      linkLabel="Continue shopping"
      icon={History}
    />
  )
}

export function RecentlyViewedTracker({ product }: { product: Product }) {
  useEffect(() => {
    trackRecentlyViewed(product)
    // Track once per product identity — avoid re-writing on referential changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  return null
}
