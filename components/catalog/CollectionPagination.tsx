"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

type CollectionPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onLoadMore?: () => void
  canLoadMore?: boolean
}

function pageWindow(page: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(1, Math.min(page - 1, totalPages - 4))
  return Array.from({ length: 5 }, (_, index) => start + index)
}

export default function CollectionPagination({
  page,
  totalPages,
  onPageChange,
  onLoadMore,
  canLoadMore = false,
}: CollectionPaginationProps) {
  if (totalPages <= 1 && !canLoadMore) return null

  const pages = pageWindow(page, totalPages)

  return (
    <div className="flex flex-col items-center gap-4 pt-2">
      {totalPages > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex flex-wrap items-center justify-center gap-1.5"
        >
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="inline-flex h-10 items-center gap-1 rounded-full border border-black/10 bg-white px-3.5 text-sm font-medium text-black/70 transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </button>

          {pages.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onPageChange(value)}
              aria-current={value === page ? "page" : undefined}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full text-sm font-medium transition-colors",
                value === page
                  ? "bg-green-600 text-white shadow-[0_8px_18px_-10px_rgba(22,163,74,0.55)]"
                  : "border border-black/10 bg-white text-black/65 hover:border-black/20 hover:text-black"
              )}
            >
              {value}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex h-10 items-center gap-1 rounded-full border border-black/10 bg-white px-3.5 text-sm font-medium text-black/70 transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      ) : null}

      {canLoadMore && onLoadMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-white px-7 text-sm font-semibold text-black transition-colors hover:border-black/20 hover:bg-neutral-50"
        >
          Load More
        </button>
      ) : null}
    </div>
  )
}
