"use client"

type GtagFn = (...args: unknown[]) => void

function gtag(): GtagFn | undefined {
  if (typeof window === "undefined") return undefined
  return window.gtag
}

export function trackSearchOpened(): void {
  gtag()?.("event", "search_open", {
    event_category: "search",
  })
}

export function trackSearchSubmitted(term: string): void {
  gtag()?.("event", "search", {
    search_term: term,
    event_category: "search",
  })
}

export function trackSearchProductClick(params: {
  term: string
  productId: string
  productTitle: string
  position: number
}): void {
  gtag()?.("event", "select_item", {
    event_category: "search",
    search_term: params.term,
    item_list_name: "predictive_search",
    items: [
      {
        item_id: params.productId,
        item_name: params.productTitle,
        index: params.position,
      },
    ],
  })
}

export function trackSearchNoResults(term: string): void {
  gtag()?.("event", "search_no_results", {
    event_category: "search",
    search_term: term,
  })
}

export function trackSearchSuggestionClick(term: string, source: string): void {
  gtag()?.("event", "search_suggestion_click", {
    event_category: "search",
    search_term: term,
    suggestion_source: source,
  })
}
