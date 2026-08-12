"use client"

import { useContext } from "react"

import { BackInStockContext } from "./BackInStockProvider"
import type { BisContextValue } from "./types"

export function useBackInStock(): BisContextValue {
  const context = useContext(BackInStockContext)

  if (!context) {
    throw new Error("useBackInStock must be used within a BackInStockProvider")
  }

  return context
}
