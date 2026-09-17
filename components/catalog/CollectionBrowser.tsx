"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"

import CollectionFilters from "@/components/catalog/CollectionFilters"
import CollectionPagination from "@/components/catalog/CollectionPagination"
import CollectionToolbar, {
  type GridColumns,
} from "@/components/catalog/CollectionToolbar"
import ProductCard from "@/components/catalog/ProductCard"
import { EscapedCardIllustration } from "@/components/ux/EmptyIllustrations"
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  PAGE_SIZE,
  collectionUrlSearch,
  collectionUrlStatesEqual,
  filterProducts,
  getAvailableLanguages,
  getAvailableTypes,
  getAvailableYears,
  getPriceBounds,
  parseCollectionUrlState,
  searchProducts,
  sortProducts,
  type CollectionFiltersState,
  type CollectionUrlState,
  type SortOption,
} from "@/lib/catalog"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

type CollectionBrowserProps = {
  products: Product[]
  searchPlaceholder: string
}

const GRID_COLS: Record<GridColumns, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
}

function CollectionBrowserInner({
  products,
  searchPlaceholder,
}: CollectionBrowserProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlState = useMemo(
    () => parseCollectionUrlState(searchParams),
    [searchParams]
  )

  const [query, setQuery] = useState(urlState.query)
  const [sort, setSort] = useState<SortOption>(urlState.sort)
  const [filters, setFilters] = useState<CollectionFiltersState>(urlState.filters)
  const [page, setPage] = useState(urlState.page)
  const [columns, setColumns] = useState<GridColumns>(4)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const skipUrlWrite = useRef(false)

  // Sync local state when the URL changes (back/forward / shared links).
  useEffect(() => {
    skipUrlWrite.current = true
    setQuery(urlState.query)
    setSort(urlState.sort)
    setFilters(urlState.filters)
    setPage(urlState.page)
  }, [urlState])

  const browseState: CollectionUrlState = useMemo(
    () => ({ sort, query, page, filters }),
    [sort, query, page, filters]
  )

  // Keep the URL shareable without full navigation.
  useEffect(() => {
    if (skipUrlWrite.current) {
      skipUrlWrite.current = false
      return
    }

    if (collectionUrlStatesEqual(browseState, urlState)) return

    const search = collectionUrlSearch(browseState)
    router.replace(`${pathname}${search}`, { scroll: false })
  }, [browseState, urlState, pathname, router])

  const priceBounds = useMemo(() => getPriceBounds(products), [products])
  const availableTypes = useMemo(() => getAvailableTypes(products), [products])
  const availableYears = useMemo(() => getAvailableYears(products), [products])
  const availableLanguages = useMemo(
    () => getAvailableLanguages(products),
    [products]
  )

  const filtered = useMemo(() => {
    return sortProducts(
      filterProducts(searchProducts(products, query), filters),
      sort
    )
  }, [products, query, filters, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  const showingFrom = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(safePage * PAGE_SIZE, filtered.length)

  useEffect(() => {
    if (!mobileFiltersOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileFiltersOpen])

  function handleQueryChange(next: string) {
    setQuery(next)
    setPage(1)
  }

  function handleSortChange(next: SortOption) {
    setSort(next)
    setPage(1)
  }

  function handleFiltersChange(next: CollectionFiltersState) {
    setFilters(next)
    setPage(1)
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function resetAll() {
    setFilters(DEFAULT_FILTERS)
    setQuery("")
    setSort(DEFAULT_SORT)
    setPage(1)
  }

  const filterPanel = (hideHeading = false) => (
    <CollectionFilters
      filters={filters}
      onChange={handleFiltersChange}
      onReset={resetFilters}
      priceBounds={priceBounds}
      availableTypes={availableTypes}
      availableYears={availableYears}
      availableLanguages={availableLanguages}
      hideHeading={hideHeading}
    />
  )

  return (
    <div>
      <CollectionToolbar
        showingFrom={showingFrom}
        showingTo={showingTo}
        total={filtered.length}
        sort={sort}
        onSortChange={handleSortChange}
        columns={columns}
        onColumnsChange={setColumns}
        query={query}
        onQueryChange={handleQueryChange}
        searchPlaceholder={searchPlaceholder}
        onOpenFilters={() => setMobileFiltersOpen(true)}
      />

      <div className="mt-3 lg:mt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-10">
        <div className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
            {filterPanel()}
          </div>
        </div>

        <div className="min-w-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-black/10 bg-neutral-50/60 px-6 py-14 text-center sm:py-20">
              <EscapedCardIllustration className="h-24" />
              <p className="mt-4 text-base font-medium tracking-tight text-black">
                No products found
              </p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-black/50">
                Try adjusting your filters, or reset to see the full collection.
              </p>
              <button
                type="button"
                onClick={resetAll}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:ring-offset-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 md:gap-6",
                  GRID_COLS[columns]
                )}
              >
                {pageItems.map((product) => (
                  <div
                    key={`${product.category}-${product.id}`}
                    className="min-w-0"
                  >
                    <ProductCard product={product} showQuickActions />
                  </div>
                ))}
              </div>

              <div className="mt-7 sm:mt-10">
                <CollectionPagination
                  page={safePage}
                  totalPages={totalPages}
                  onPageChange={(next) => {
                    setPage(next)
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile filter slide-over */}
      <div
        className={cn(
          "fixed inset-0 z-[60] lg:hidden",
          mobileFiltersOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileFiltersOpen}
      >
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => setMobileFiltersOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-300",
            mobileFiltersOpen ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
            mobileFiltersOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-sm font-semibold tracking-tight text-black">
              Filters
            </p>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="inline-flex size-11 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-black/5 hover:text-black"
              aria-label="Close filters"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-1 sm:px-5 sm:py-2">
            {filterPanel(true)}
          </div>
          <div className="border-t border-black/[0.06] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Show {filtered.length}{" "}
              {filtered.length === 1 ? "product" : "products"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CollectionBrowserSkeleton({ products }: { products: Product[] }) {
  const preview = products.slice(0, PAGE_SIZE)

  return (
    <div aria-busy="true" aria-label="Loading collection filters">
      <div className="h-16 border-b border-black/[0.06]" />
      <div className="mt-3 lg:mt-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-10">
        <div className="hidden lg:block" />
        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {preview.map((product) => (
            <div key={product.id} className="min-w-0">
              <ProductCard product={product} showQuickActions />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CollectionBrowser({
  products,
  searchPlaceholder,
}: CollectionBrowserProps) {
  return (
    <Suspense fallback={<CollectionBrowserSkeleton products={products} />}>
      <CollectionBrowserInner
        products={products}
        searchPlaceholder={searchPlaceholder}
      />
    </Suspense>
  )
}
