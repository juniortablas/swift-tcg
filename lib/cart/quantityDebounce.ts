import { CART_QUANTITY_DEBOUNCE_MS } from "./constants"

export type PendingQuantityLine = {
  lineId: string
  quantity: number
}

/**
 * Coalesce rapid quantity edits into one flush. UI callers apply optimistic
 * state themselves; this only tracks the latest quantity per line.
 */
export function createQuantityDebouncer(options?: { delayMs?: number }) {
  const delayMs = options?.delayMs ?? CART_QUANTITY_DEBOUNCE_MS
  const pending = new Map<string, number>()
  let timer: ReturnType<typeof setTimeout> | null = null

  function takePending(): PendingQuantityLine[] {
    if (pending.size === 0) return []
    const lines = [...pending.entries()].map(([lineId, quantity]) => ({
      lineId,
      quantity,
    }))
    pending.clear()
    return lines
  }

  return {
    set(lineId: string, quantity: number) {
      pending.set(lineId, quantity)
    },
    peek(): Map<string, number> {
      return pending
    },
    hasPending(): boolean {
      return pending.size > 0
    },
    schedule(flush: () => void) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        flush()
      }, delayMs)
    },
    cancelTimer() {
      if (!timer) return
      clearTimeout(timer)
      timer = null
    },
    drain(): PendingQuantityLine[] {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      return takePending()
    },
  }
}

export function mergePendingQuantities<
  T extends { id: string; quantity: number },
>(items: T[], pending: Map<string, number>): T[] {
  if (pending.size === 0) return items
  const next: T[] = []
  for (const item of items) {
    const quantity = pending.get(item.id)
    if (quantity == null) {
      next.push(item)
      continue
    }
    if (quantity <= 0) continue
    next.push({ ...item, quantity })
  }
  return next
}
