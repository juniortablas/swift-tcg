"use client"

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { redirectToCustomerLogin } from "@/lib/account/customerLogin"
import {
  REVIEW_OPEN_QUERY_PARAM,
  REVIEW_PENDING_STORAGE_KEY,
  emptyBreakdown,
} from "@/lib/reviews/constants"
import type {
  ReviewContextValue,
  ReviewEligibility,
  ReviewSummary,
  ReviewsEligibilityApiResponse,
} from "@/lib/reviews/types"

export const ReviewContext = createContext<ReviewContextValue | null>(null)

type ReviewProviderProps = {
  children: ReactNode
  productId: string
  productTitle: string
  productSlug: string
  productUrl: string
  productImage?: string | null
  initialSummary?: ReviewSummary
  customerLoggedIn?: boolean
}

export function ReviewProvider({
  children,
  productId,
  productTitle,
  productSlug,
  productUrl,
  productImage = null,
  initialSummary,
  customerLoggedIn = false,
}: ReviewProviderProps) {
  const [summary, setSummary] = useState<ReviewSummary>(
    initialSummary ?? { average: 0, count: 0, breakdown: emptyBreakdown() }
  )
  const [loggedIn, setLoggedIn] = useState(customerLoggedIn)
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [helpfulVoteIds, setHelpfulVoteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      try {
        const res = await fetch(
          `/api/reviews?productId=${encodeURIComponent(productId)}&view=eligibility`,
          { cache: "no-store" }
        )
        const payload = (await res.json()) as ReviewsEligibilityApiResponse
        if (cancelled) return
        setLoggedIn(payload.loggedIn)
        setEligibility({
          loggedIn: payload.loggedIn,
          canReview: payload.canReview,
          reason: payload.reason,
          existingReviewId: payload.existingReviewId,
          verifiedPurchase: payload.verifiedPurchase,
          orderId: payload.orderId,
        })
      } catch {
        if (cancelled) return
        setEligibility({
          loggedIn: customerLoggedIn,
          canReview: false,
          reason: customerLoggedIn ? "not_purchased" : "auth_required",
          existingReviewId: null,
          verifiedPurchase: false,
          orderId: null,
        })
      } finally {
        if (!cancelled) setIsHydrated(true)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [customerLoggedIn, productId])

  // After login: open modal when pending flag or ?write-review=1
  useEffect(() => {
    if (!isHydrated || !loggedIn) return

    let shouldOpen = false
    try {
      const pending = window.sessionStorage.getItem(REVIEW_PENDING_STORAGE_KEY)
      if (pending === productId) {
        window.sessionStorage.removeItem(REVIEW_PENDING_STORAGE_KEY)
        shouldOpen = true
      }
    } catch {
      // ignore
    }

    const params = new URLSearchParams(window.location.search)
    if (params.get(REVIEW_OPEN_QUERY_PARAM) === "1") {
      shouldOpen = true
      params.delete(REVIEW_OPEN_QUERY_PARAM)
      const next = `${window.location.pathname}${
        params.toString() ? `?${params}` : ""
      }${window.location.hash}`
      window.history.replaceState({}, "", next)
    }

    if (shouldOpen && eligibility?.canReview) {
      queueMicrotask(() => setModalOpen(true))
    }
  }, [eligibility?.canReview, isHydrated, loggedIn, productId])

  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])

  const refreshEligibility = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/reviews?productId=${encodeURIComponent(productId)}&view=eligibility`,
        { cache: "no-store" }
      )
      const payload = (await res.json()) as ReviewsEligibilityApiResponse
      setLoggedIn(payload.loggedIn)
      setEligibility({
        loggedIn: payload.loggedIn,
        canReview: payload.canReview,
        reason: payload.reason,
        existingReviewId: payload.existingReviewId,
        verifiedPurchase: payload.verifiedPurchase,
        orderId: payload.orderId,
      })
    } catch {
      // Keep existing eligibility on refresh failure.
    }
  }, [productId])

  const requestWriteReview = useCallback(() => {
    if (!loggedIn) {
      const returnTo = `${productUrl}?${REVIEW_OPEN_QUERY_PARAM}=1`
      redirectToCustomerLogin({
        returnTo,
        pending: { key: REVIEW_PENDING_STORAGE_KEY, value: productId },
      })
      return
    }
    if (eligibility && !eligibility.canReview) {
      return
    }
    setModalOpen(true)
  }, [eligibility, loggedIn, productId, productUrl])

  const markHelpfulLocal = useCallback((reviewId: string) => {
    setHelpfulVoteIds((current) => {
      const next = new Set(current)
      next.add(reviewId)
      return next
    })
  }, [])

  const value = useMemo<ReviewContextValue>(
    () => ({
      productId,
      productTitle,
      productSlug,
      productUrl,
      productImage,
      summary,
      isHydrated,
      loggedIn,
      eligibility,
      modalOpen,
      openModal,
      closeModal,
      requestWriteReview,
      refreshEligibility,
      setSummary,
      helpfulVoteIds,
      markHelpfulLocal,
    }),
    [
      closeModal,
      eligibility,
      helpfulVoteIds,
      isHydrated,
      loggedIn,
      markHelpfulLocal,
      modalOpen,
      openModal,
      productId,
      productImage,
      productSlug,
      productTitle,
      productUrl,
      refreshEligibility,
      requestWriteReview,
      summary,
    ]
  )

  return (
    <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>
  )
}
