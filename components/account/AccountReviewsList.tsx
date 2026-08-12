"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import ReviewStars from "@/components/reviews/ReviewStars"
import EmptyState from "@/components/ux/EmptyState"
import { StarEmptyIllustration } from "@/components/ux/EmptyIllustrations"
import {
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_NICKNAME_MAX,
  REVIEW_STATUS,
  REVIEW_TITLE_MAX,
} from "@/lib/reviews/constants"
import type { ProductReview, ReviewsMutationApiResponse } from "@/lib/reviews/types"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

type AccountReviewRow = {
  review: ProductReview
  product: Product | null
}

function statusLabel(status: ProductReview["status"]) {
  switch (status) {
    case REVIEW_STATUS.pending:
      return { label: "Pending", className: "bg-amber-50 text-amber-800" }
    case REVIEW_STATUS.approved:
      return { label: "Approved", className: "bg-green-50 text-green-700" }
    case REVIEW_STATUS.rejected:
      return { label: "Rejected", className: "bg-neutral-100 text-black/50" }
  }
}

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ReviewsEmptyState() {
  return (
    <EmptyState
      illustration={<StarEmptyIllustration />}
      title="No reviews yet"
      description="After you purchase and leave a review, it will show up here. Share how your sealed product arrived — collectors rely on it."
      actions={[
        { label: "Continue shopping", href: "/" },
        {
          label: "View your orders",
          href: "/account/orders",
          variant: "secondary",
        },
      ]}
    />
  )
}

function PendingEditForm({
  review,
  onCancel,
  onSaved,
}: {
  review: ProductReview
  onCancel: () => void
  onSaved: (next: ProductReview) => void
}) {
  const [rating, setRating] = useState(review.rating)
  const [title, setTitle] = useState(review.title ?? "")
  const [body, setBody] = useState(review.body)
  const [nickname, setNickname] = useState(review.nickname ?? "")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (body.trim().length < REVIEW_BODY_MIN) {
      setError(`Review text must be at least ${REVIEW_BODY_MIN} characters.`)
      return
    }

    const numericId = review.id.replace(/^gid:\/\/shopify\/Metaobject\//, "")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${encodeURIComponent(numericId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            title: title.trim() || null,
            body: body.trim(),
            nickname: nickname.trim() || null,
          }),
        })
        const payload = (await res.json()) as ReviewsMutationApiResponse
        if (!res.ok || !payload.review) {
          setError(payload.error?.message ?? "Unable to update review.")
          return
        }
        onSaved(payload.review)
      } catch {
        setError("Unable to update review.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-black/[0.06] pt-4">
      <div>
        <p className="mb-1.5 text-xs font-medium text-black/60">Rating</p>
        <ReviewStars
          rating={rating}
          size="md"
          interactive
          onChange={setRating}
        />
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-black/60">Title</span>
        <input
          value={title}
          maxLength={REVIEW_TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
          className="h-10 w-full rounded-lg border border-black/[0.1] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-black/60">Review</span>
        <textarea
          value={body}
          maxLength={REVIEW_BODY_MAX}
          rows={4}
          onChange={(event) => setBody(event.target.value)}
          className="w-full rounded-lg border border-black/[0.1] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-black/60">Nickname</span>
        <input
          value={nickname}
          maxLength={REVIEW_NICKNAME_MAX}
          onChange={(event) => setNickname(event.target.value)}
          className="h-10 w-full rounded-lg border border-black/[0.1] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-full bg-green-600 px-4 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-full border border-black/[0.1] px-4 text-xs font-semibold text-black"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function AccountReviewsList({
  items,
}: {
  items: AccountReviewRow[]
}) {
  const [rows, setRows] = useState(items)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete(reviewId: string) {
    if (!window.confirm("Delete this pending review?")) return
    setError(null)
    const numericId = reviewId.replace(/^gid:\/\/shopify\/Metaobject\//, "")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${encodeURIComponent(numericId)}`, {
          method: "DELETE",
        })
        const payload = (await res.json()) as ReviewsMutationApiResponse
        if (!res.ok) {
          setError(payload.error?.message ?? "Unable to delete review.")
          return
        }
        setRows((current) => current.filter((row) => row.review.id !== reviewId))
        setEditingId(null)
      } catch {
        setError("Unable to delete review.")
      }
    })
  }

  if (rows.length === 0) return <ReviewsEmptyState />

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map(({ review, product }) => {
          const status = statusLabel(review.status)
          const canEdit = review.status === REVIEW_STATUS.pending
          const href =
            product?.url || (product?.slug ? `/products/${product.slug}` : null)
          const editing = editingId === review.id

          return (
            <li
              key={review.id}
              className="rounded-xl border border-black/[0.06] bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {href ? (
                    <Link
                      href={href}
                      className="text-sm font-semibold text-black hover:underline"
                    >
                      {product?.title ?? "Product"}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold text-black">Product</p>
                  )}
                  <p className="mt-0.5 text-xs text-black/45">
                    {formatDate(review.reviewedAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
                    status.className
                  )}
                >
                  {status.label}
                </span>
              </div>

              {!editing ? (
                <>
                  <div className="mt-3">
                    <ReviewStars rating={review.rating} size="sm" />
                  </div>
                  {review.title ? (
                    <p className="mt-2 text-sm font-semibold text-black">
                      {review.title}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm leading-relaxed text-black/70 whitespace-pre-wrap">
                    {review.body}
                  </p>
                </>
              ) : null}

              {canEdit && editing ? (
                <PendingEditForm
                  review={review}
                  onCancel={() => setEditingId(null)}
                  onSaved={(next) => {
                    setRows((current) =>
                      current.map((row) =>
                        row.review.id === next.id
                          ? { ...row, review: next }
                          : row
                      )
                    )
                    setEditingId(null)
                  }}
                />
              ) : null}

              {canEdit && !editing ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(review.id)}
                    className="inline-flex h-9 items-center rounded-full border border-black/[0.1] px-3 text-xs font-semibold text-black hover:border-black/20"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleDelete(review.id)}
                    className="inline-flex h-9 items-center rounded-full border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ) : null}

              {!canEdit ? (
                <p className="mt-3 text-xs text-black/40">
                  Approved reviews can&apos;t be edited. Contact support if you need a
                  change.
                </p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
