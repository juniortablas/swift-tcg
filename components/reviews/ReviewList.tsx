"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"

import ReviewCard from "@/components/reviews/ReviewCard"
import ReviewFilters from "@/components/reviews/ReviewFilters"
import ApiErrorState from "@/components/ux/ApiErrorState"
import EmptyState from "@/components/ux/EmptyState"
import { StarEmptyIllustration } from "@/components/ux/EmptyIllustrations"
import { Skeleton } from "@/components/ux/Skeleton"
import { REVIEW_PAGE_SIZE } from "@/lib/reviews/constants"
import type {
  ProductReview,
  ReviewSort,
  ReviewsListApiResponse,
} from "@/lib/reviews/types"
import { cn } from "@/lib/utils"

type ReviewListProps = {
  productId: string
  loggedIn?: boolean
  helpfulVoteIds?: Set<string>
  onHelpful?: (reviewId: string, helpfulCount: number) => void
  onSummary?: (summary: ReviewsListApiResponse["summary"]) => void
  className?: string
}

export default function ReviewList({
  productId,
  loggedIn = false,
  helpfulVoteIds,
  onHelpful,
  onSummary,
  className,
}: ReviewListProps) {
  const [sort, setSort] = useState<ReviewSort>("newest")
  const [page, setPage] = useState(1)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [hasNextPage, setHasNextPage] = useState(false)
  const [total, setTotal] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const activatedRef = useRef(false)

  const load = useCallback(
    (nextPage: number, nextSort: ReviewSort, append: boolean) => {
      startTransition(async () => {
        try {
          const params = new URLSearchParams({
            productId,
            page: String(nextPage),
            pageSize: String(REVIEW_PAGE_SIZE),
            sort: nextSort,
          })
          const res = await fetch(`/api/reviews?${params}`, {
            cache: "no-store",
          })
          const payload = (await res.json()) as ReviewsListApiResponse
          if (!res.ok || payload.error) {
            setError(payload.error?.message ?? "Unable to load reviews.")
            setLoaded(true)
            return
          }
          setError(null)
          setReviews((current) =>
            append ? [...current, ...payload.reviews] : payload.reviews
          )
          setHasNextPage(payload.pageInfo.hasNextPage)
          setTotal(payload.pageInfo.total)
          setPage(payload.pageInfo.page)
          onSummary?.(payload.summary)
          setLoaded(true)
        } catch {
          setError("Unable to load reviews.")
          setLoaded(true)
        }
      })
    },
    [onSummary, productId]
  )

  useEffect(() => {
    activatedRef.current = false
    let cancelled = false
    const el = document.getElementById("product-reviews")

    function activate() {
      if (cancelled || activatedRef.current) return
      activatedRef.current = true
      load(1, "newest", false)
    }

    if (!el || typeof IntersectionObserver === "undefined") {
      activate()
      return () => {
        cancelled = true
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          activate()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [load, productId])

  function handleSortChange(next: ReviewSort) {
    setSort(next)
    setReviews([])
    setLoaded(false)
    load(1, next, false)
  }

  function handleLoadMore() {
    load(page + 1, sort, true)
  }

  return (
    <div className={cn("space-y-4", className)}>
      <ReviewFilters sort={sort} onSortChange={handleSortChange} />

      {!loaded && pending ? (
        <div
          className="space-y-3 py-2"
          aria-busy="true"
          aria-live="polite"
        >
          <span className="sr-only">Loading reviews</span>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="rounded-[17px] border border-black/[0.06] p-4"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <ApiErrorState
          compact
          title="Couldn't load reviews"
          description={error}
          onRetry={() => {
            setLoaded(false)
            setError(null)
            load(1, sort, false)
          }}
        />
      ) : null}

      {loaded && !error && reviews.length === 0 ? (
        <EmptyState
          compact
          illustration={<StarEmptyIllustration className="h-20" />}
          title="No reviews yet"
          description="Be the first to share how this product arrived — sealed condition, packing, and shipping notes help other collectors."
          actions={[{ label: "Browse more products", href: "/new-releases" }]}
        />
      ) : null}

      <ul className="space-y-3" aria-live="polite">
        {reviews.map((review) => (
          <li key={review.id}>
            <ReviewCard
              review={review}
              loggedIn={loggedIn}
              alreadyVoted={helpfulVoteIds?.has(review.id)}
              onHelpful={onHelpful}
            />
          </li>
        ))}
      </ul>

      {hasNextPage ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={pending}
            className="h-10 rounded-full border border-black/[0.1] bg-white px-5 text-sm font-semibold text-black transition hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 disabled:opacity-50"
          >
            {pending ? "Loading…" : `Load more (${reviews.length} of ${total})`}
          </button>
        </div>
      ) : null}
    </div>
  )
}
