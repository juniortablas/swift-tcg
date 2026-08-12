"use client"

import { useContext } from "react"

import { ReviewContext } from "@/lib/reviews/ReviewsProvider"
import type { ReviewContextValue } from "@/lib/reviews/types"

export function useReviews(): ReviewContextValue {
  const ctx = useContext(ReviewContext)
  if (!ctx) {
    throw new Error("useReviews must be used within ReviewProvider")
  }
  return ctx
}
