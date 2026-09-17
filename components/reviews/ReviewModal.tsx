"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import ReviewStars from "@/components/reviews/ReviewStars"
import {
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  REVIEW_MAX_IMAGES,
  REVIEW_NICKNAME_MAX,
  REVIEW_TITLE_MAX,
} from "@/lib/reviews/constants"
import type { ReviewsMutationApiResponse } from "@/lib/reviews/types"
import { cn } from "@/lib/utils"

type ReviewModalProps = {
  open: boolean
  onClose: () => void
  productId: string
  productTitle: string
  onSubmitted?: () => void
}

function ReviewModalForm({
  onClose,
  productId,
  productTitle,
  onSubmitted,
}: Omit<ReviewModalProps, "open">) {
  const titleId = useId()
  const firstFieldRef = useRef<HTMLButtonElement | null>(null)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [nickname, setNickname] = useState("")
  const [imageIds, setImageIds] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    firstFieldRef.current?.focus()

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    setUploading(true)
    try {
      const remaining = REVIEW_MAX_IMAGES - imageIds.length
      const selected = Array.from(files).slice(0, remaining)
      const uploaded: string[] = []
      for (const file of selected) {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/reviews", {
          method: "POST",
          body: form,
        })
        const payload = (await res.json()) as ReviewsMutationApiResponse & {
          imageId?: string
        }
        if (!res.ok || !payload.imageId) {
          throw new Error(payload.error?.message ?? "Photo upload failed.")
        }
        uploaded.push(payload.imageId)
      }
      setImageIds((current) => [...current, ...uploaded])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed.")
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (rating < 1 || rating > 5) {
      setError("Please select a star rating.")
      return
    }
    if (body.trim().length < REVIEW_BODY_MIN) {
      setError(`Review text must be at least ${REVIEW_BODY_MIN} characters.`)
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            productId,
            rating,
            title: title.trim() || null,
            body: body.trim(),
            nickname: nickname.trim() || null,
            imageIds,
          }),
        })
        const payload = (await res.json()) as ReviewsMutationApiResponse
        if (!res.ok) {
          setError(payload.error?.message ?? "Unable to submit review.")
          return
        }
        setSuccess(true)
        onSubmitted?.()
      } catch {
        setError("Unable to submit review.")
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Close review form"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-xl sm:max-w-lg sm:rounded-[24px]"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-black"
            >
              Write a Review
            </h2>
            <p className="mt-0.5 line-clamp-1 text-sm text-black/50">
              {productTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-black/50 transition hover:bg-black/[0.04] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4 px-5 py-8 text-center">
            <p className="text-base font-semibold text-black">
              Thanks — your review is pending approval.
            </p>
            <p className="text-sm text-black/55">
              It will appear on this product once our team approves it in Shopify.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <p className="mb-2 text-sm font-medium text-black">
                  Rating <span className="text-red-600">*</span>
                </p>
                <ReviewStars
                  rating={rating}
                  size="lg"
                  interactive
                  onChange={setRating}
                />
                <button
                  ref={firstFieldRef}
                  type="button"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-black">
                  Title <span className="font-normal text-black/40">(optional)</span>
                </span>
                <input
                  type="text"
                  value={title}
                  maxLength={REVIEW_TITLE_MAX}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-11 w-full rounded-xl border border-black/[0.1] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
                  placeholder="Sum up your experience"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-black">
                  Review <span className="text-red-600">*</span>
                </span>
                <textarea
                  value={body}
                  maxLength={REVIEW_BODY_MAX}
                  onChange={(event) => setBody(event.target.value)}
                  rows={5}
                  required
                  className="w-full resize-y rounded-xl border border-black/[0.1] px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
                  placeholder="What stood out about quality, packaging, or authenticity?"
                />
                <span className="mt-1 block text-xs text-black/40">
                  {body.trim().length}/{REVIEW_BODY_MAX}
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-black">
                  Nickname{" "}
                  <span className="font-normal text-black/40">(optional)</span>
                </span>
                <input
                  type="text"
                  value={nickname}
                  maxLength={REVIEW_NICKNAME_MAX}
                  onChange={(event) => setNickname(event.target.value)}
                  className="h-11 w-full rounded-xl border border-black/[0.1] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40"
                  placeholder="How your name appears"
                />
              </label>

              <div>
                <p className="mb-1.5 text-sm font-medium text-black">
                  Photos{" "}
                  <span className="font-normal text-black/40">
                    (optional, up to {REVIEW_MAX_IMAGES})
                  </span>
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={uploading || imageIds.length >= REVIEW_MAX_IMAGES}
                  onChange={(event) => {
                    void handleFiles(event.target.files)
                    event.target.value = ""
                  }}
                  className="block w-full text-sm text-black/60 file:mr-3 file:rounded-full file:border-0 file:bg-black/[0.04] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-black"
                />
                {imageIds.length > 0 ? (
                  <p className="mt-1.5 text-xs text-black/45">
                    {imageIds.length} photo{imageIds.length === 1 ? "" : "s"}{" "}
                    attached
                    {uploading ? " · uploading…" : ""}
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="border-t border-black/[0.06] px-5 py-4">
              <button
                type="submit"
                disabled={pending || uploading}
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 disabled:opacity-50"
              >
                {pending ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ReviewModal({
  open,
  onClose,
  productId,
  productTitle,
  onSubmitted,
}: ReviewModalProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  if (!open || !mounted) return null

  return createPortal(
    <ReviewModalForm
      onClose={onClose}
      productId={productId}
      productTitle={productTitle}
      onSubmitted={onSubmitted}
    />,
    document.body
  )
}
