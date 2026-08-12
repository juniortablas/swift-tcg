"use client"

import { useContext } from "react"

import { WishlistContext } from "./WishlistProvider"
import type { WishlistContextValue } from "./types"

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext)

  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }

  return context
}
