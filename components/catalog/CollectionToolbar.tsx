"use client"

import { Search, SlidersHorizontal } from "lucide-react"

import type { SortOption } from "@/lib/catalog"
import { cn } from "@/lib/utils"

export type GridColumns = 2 | 3 | 4

type CollectionToolbarProps = {
  showingFrom: number
  showingTo: number
  total: number
  sort: SortOption
  onSortChange: (sort: SortOption) => void
  columns: GridColumns
  onColumnsChange: (columns: GridColumns) => void
  query: string
  onQueryChange: (query: string) => void
  searchPlaceholder: string
  onOpenFilters: () => void
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price Low–High" },
  { value: "price-desc", label: "Price High–Low" },
  { value: "release-date", label: "Release Date" },
  { value: "alphabetical", label: "Alphabetical" },
]

const COLUMN_OPTIONS: GridColumns[] = [2, 3, 4]

export default function CollectionToolbar({
  showingFrom,
  showingTo,
  total,
  sort,
  onSortChange,
  columns,
  onColumnsChange,
  query,
  onQueryChange,
  searchPlaceholder,
  onOpenFilters,
}: CollectionToolbarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-black/[0.06] pb-2.5 sm:gap-3 sm:pb-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <p className="text-xs text-black/50 sm:text-sm">
          {total === 0 ? (
            "Showing 0 products"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium tabular-nums text-black/70">
                {showingFrom}–{showingTo}
              </span>{" "}
              of{" "}
              <span className="font-medium tabular-nums text-black/70">
                {total}
              </span>{" "}
              products
            </>
          )}
        </p>

        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 text-sm font-medium text-black/70 transition-colors hover:border-black/20 hover:text-black lg:hidden"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          Filters
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label className="relative block w-full sm:min-w-[220px] sm:flex-1 lg:w-64 lg:flex-none">
          <span className="sr-only">Search this collection</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-black/35"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-full border border-black/10 bg-white pr-4 pl-10 text-sm text-black outline-none transition-colors placeholder:text-black/35 focus:border-black/20 focus:ring-2 focus:ring-green-600/15 sm:h-10"
          />
        </label>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="collection-sort">
            Sort products
          </label>
          <select
            id="collection-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            className="h-11 min-w-0 flex-1 rounded-full border border-black/10 bg-white px-3.5 text-sm font-medium text-black/75 outline-none transition-colors hover:border-black/20 focus:border-black/20 focus:ring-2 focus:ring-green-600/15 sm:h-10 sm:min-w-[10.5rem] sm:flex-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div
            className="hidden items-center gap-0.5 rounded-full border border-black/10 bg-neutral-50 p-1 lg:inline-flex"
            role="group"
            aria-label="Grid columns"
          >
            {COLUMN_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onColumnsChange(value)}
                aria-pressed={columns === value}
                aria-label={`${value} column grid`}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                  columns === value
                    ? "bg-white text-black shadow-sm"
                    : "text-black/40 hover:text-black/70"
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
