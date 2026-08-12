"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { Clock, Search, TrendingUp, X } from "lucide-react"

import SearchProductRow from "@/components/search/SearchProductRow"
import { Skeleton } from "@/components/ux/Skeleton"
import {
  trackSearchNoResults,
  trackSearchOpened,
  trackSearchProductClick,
  trackSearchSubmitted,
  trackSearchSuggestionClick,
} from "@/lib/search/analytics"
import {
  POPULAR_CATEGORIES,
  POPULAR_SEARCHES,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARS,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search/constants"
import { fetchPredictiveSearch } from "@/lib/search/fetchPredictive"
import { highlightMatch } from "@/lib/search/highlight"
import {
  clearRecentSearches,
  pushRecentSearch,
  readRecentSearches,
} from "@/lib/search/recent"
import type { PredictiveSearchPayload } from "@/lib/shopify/predictiveSearchTypes"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SearchStatus = "idle" | "loading" | "ready" | "error"

type FlatItem =
  | { kind: "product"; key: string; product: Product }
  | {
      kind: "collection"
      key: string
      title: string
      url: string
      image: string | null
    }
  | { kind: "page"; key: string; title: string; url: string }
  | { kind: "query"; key: string; text: string }
  | { kind: "recent"; key: string; text: string }
  | { kind: "popular"; key: string; text: string }
  | { kind: "category"; key: string; label: string; href: string }
  | { kind: "view_all"; key: string; href: string }

const EMPTY_PAYLOAD: PredictiveSearchPayload = {
  products: [],
  collections: [],
  pages: [],
  queries: [],
  source: "predictive",
}

function productHref(product: Product): string {
  if (product.url) return product.url
  if (product.slug) return `/products/${product.slug}`
  return "/products"
}

function SectionHeading({ children }: { children: string }) {
  return (
    <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-[0.14em] text-black/40 uppercase">
      {children}
    </p>
  )
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const optionIdPrefix = useId()
  const liveId = useId()

  const [query, setQuery] = useState("")
  const [payload, setPayload] = useState<PredictiveSearchPayload>(EMPTY_PAYLOAD)
  const [activeIndex, setActiveIndex] = useState(0)
  const [status, setStatus] = useState<SearchStatus>("idle")
  const [retryToken, setRetryToken] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const openedTracked = useRef(false)
  const noResultsTracked = useRef<string | null>(null)

  const trimmed = query.trim()
  const canSearch = trimmed.length >= SEARCH_MIN_CHARS

  const close = useCallback(() => {
    onOpenChange(false)
    setQuery("")
    setPayload(EMPTY_PAYLOAD)
    setActiveIndex(0)
    setStatus("idle")
    openedTracked.current = false
    noResultsTracked.current = null
  }, [onOpenChange])

  const rememberAndGo = useCallback(
    (term: string, href: string) => {
      setRecent(pushRecentSearch(term))
      trackSearchSubmitted(term)
      close()
      router.push(href)
    },
    [close, router]
  )

  const selectProduct = useCallback(
    (product: Product, position: number) => {
      const term = trimmed || product.title
      trackSearchProductClick({
        term,
        productId: product.id,
        productTitle: product.title,
        position,
      })
      rememberAndGo(term, productHref(product))
    },
    [rememberAndGo, trimmed]
  )

  const applySuggestion = useCallback(
    (text: string, source: string) => {
      trackSearchSuggestionClick(text, source)
      setQuery(text)
      setActiveIndex(0)
      inputRef.current?.focus()
    },
    []
  )

  const idleItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = []
    for (const text of recent) {
      items.push({ kind: "recent", key: `recent:${text}`, text })
    }
    for (const text of POPULAR_SEARCHES) {
      if (recent.some((item) => item.toLowerCase() === text.toLowerCase())) {
        continue
      }
      items.push({ kind: "popular", key: `popular:${text}`, text })
    }
    for (const category of POPULAR_CATEGORIES) {
      items.push({
        kind: "category",
        key: `category:${category.href}`,
        label: category.label,
        href: category.href,
      })
    }
    return items
  }, [recent])

  const resultItems = useMemo<FlatItem[]>(() => {
    if (!canSearch || status === "idle" || status === "loading") return []
    const items: FlatItem[] = []
    for (const product of payload.products) {
      items.push({
        kind: "product",
        key: `product:${product.id}`,
        product,
      })
    }
    for (const collection of payload.collections) {
      items.push({
        kind: "collection",
        key: `collection:${collection.id}`,
        title: collection.title,
        url: collection.url,
        image: collection.image,
      })
    }
    for (const page of payload.pages) {
      items.push({
        kind: "page",
        key: `page:${page.id}`,
        title: page.title,
        url: page.url,
      })
    }
    for (const suggestion of payload.queries) {
      items.push({
        kind: "query",
        key: `query:${suggestion.text}`,
        text: suggestion.text,
      })
    }
    if (payload.products.length > 0 || status === "ready") {
      items.push({
        kind: "view_all",
        key: "view_all",
        href: `/search?q=${encodeURIComponent(trimmed)}`,
      })
    }
    return items
  }, [canSearch, payload, status, trimmed])

  const flatItems = status === "idle" || !canSearch ? idleItems : resultItems

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return

    setRecent(readRecentSearches())
    if (!openedTracked.current) {
      openedTracked.current = true
      trackSearchOpened()
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    if (!canSearch) {
      setStatus("idle")
      setPayload(EMPTY_PAYLOAD)
      return
    }

    const controller = new AbortController()
    setStatus("loading")

    const timer = window.setTimeout(async () => {
      try {
        const next = await fetchPredictiveSearch(
          trimmed,
          controller.signal,
          SEARCH_RESULT_LIMIT
        )
        setPayload(next)
        setActiveIndex(0)
        setStatus("ready")

        const empty =
          next.products.length === 0 &&
          next.collections.length === 0 &&
          next.pages.length === 0
        if (empty && noResultsTracked.current !== trimmed) {
          noResultsTracked.current = trimmed
          trackSearchNoResults(trimmed)
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error("Search request failed.", error)
        setPayload(EMPTY_PAYLOAD)
        setActiveIndex(0)
        setStatus("error")
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [open, canSearch, trimmed, retryToken])

  // Prefetch one character ahead when user pauses on a ready query.
  useEffect(() => {
    if (!open || status !== "ready" || !canSearch) return
    const suggestions = payload.queries.slice(0, 2)
    for (const suggestion of suggestions) {
      void fetchPredictiveSearch(suggestion.text).catch(() => {})
    }
  }, [open, status, canSearch, payload.queries])

  useEffect(() => {
    if (!open || flatItems.length === 0) return
    const active = flatItems[activeIndex]
    if (!active) return
    const el = document.getElementById(`${optionIdPrefix}-${active.key}`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, flatItems, open, optionIdPrefix])

  function activateItem(item: FlatItem, index: number) {
    switch (item.kind) {
      case "product":
        selectProduct(item.product, index)
        break
      case "collection":
      case "page":
      case "view_all":
      case "category": {
        const href =
          item.kind === "category"
            ? item.href
            : item.kind === "view_all"
              ? item.href
              : item.url
        const term =
          item.kind === "category"
            ? item.label
            : item.kind === "view_all"
              ? trimmed
              : item.title
        rememberAndGo(term, href)
        break
      }
      case "query":
      case "recent":
      case "popular":
        applySuggestion(
          item.text,
          item.kind === "query" ? "suggestion" : item.kind
        )
        break
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault()
      if (query) {
        setQuery("")
        setPayload(EMPTY_PAYLOAD)
        setStatus("idle")
        setActiveIndex(0)
      } else {
        close()
      }
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (flatItems.length === 0) return
      setActiveIndex((index) => (index + 1) % flatItems.length)
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      if (flatItems.length === 0) return
      setActiveIndex((index) =>
        (index - 1 + flatItems.length) % flatItems.length
      )
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const active = flatItems[activeIndex]
      if (active) {
        activateItem(active, activeIndex)
        return
      }
      if (canSearch) {
        rememberAndGo(trimmed, `/search?q=${encodeURIComponent(trimmed)}`)
      }
      return
    }

    if (event.key === "Tab" && !event.shiftKey && flatItems[activeIndex]) {
      // Allow tab to move focus naturally; keep activedescendant in sync.
      return
    }
  }

  if (!open) return null

  const activeOptionId =
    flatItems[activeIndex] != null
      ? `${optionIdPrefix}-${flatItems[activeIndex].key}`
      : undefined

  const liveMessage =
    status === "loading"
      ? "Loading search results"
      : status === "ready"
        ? `${payload.products.length} products, ${payload.collections.length} collections`
        : status === "error"
          ? "Search failed"
          : "Search suggestions"

  const hasTypedResults =
    canSearch &&
    status === "ready" &&
    payload.products.length === 0 &&
    payload.collections.length === 0 &&
    payload.pages.length === 0

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={close}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search products"
        className={cn(
          "relative flex h-dvh w-full flex-col overflow-hidden bg-white sm:mx-auto sm:mt-[10vh] sm:h-auto sm:max-h-[min(80vh,40rem)] sm:w-[min(100%-1rem,36rem)] sm:rounded-2xl sm:border sm:border-black/10 sm:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.35)]"
        )}
      >
        <div className="flex items-center gap-3 border-b border-black/5 px-3 sm:px-4">
          <Search className="size-4 shrink-0 text-black/35" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search Pokémon, One Piece…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            aria-busy={status === "loading"}
            className="h-14 w-full bg-transparent text-base text-black outline-none placeholder:text-black/35 sm:text-[15px]"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("")
                setPayload(EMPTY_PAYLOAD)
                setStatus("idle")
                setActiveIndex(0)
                inputRef.current?.focus()
              }}
              className="inline-flex size-11 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-black/5 hover:text-black sm:size-9"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={close}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full px-3 text-sm font-medium text-black/50 transition-colors hover:bg-black/5 hover:text-black sm:hidden"
          >
            Cancel
          </button>
          <kbd className="hidden rounded-md border border-black/10 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-black/40 sm:inline">
            ESC
          </kbd>
        </div>

        <div id={liveId} className="sr-only" aria-live="polite">
          {liveMessage}
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          aria-busy={status === "loading"}
          className="flex-1 overflow-y-auto overscroll-contain p-2 sm:max-h-[min(60vh,28rem)]"
        >
          {!canSearch ? (
            <div>
              {recent.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-3 pt-2">
                    <SectionHeading>Recent</SectionHeading>
                    <button
                      type="button"
                      onClick={() => {
                        clearRecentSearches()
                        setRecent([])
                      }}
                      className="text-xs font-medium text-black/40 hover:text-black/70"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="space-y-0.5">
                    {recent.map((text) => {
                      const itemIndex = flatItems.findIndex(
                        (item) =>
                          item.kind === "recent" && item.text === text
                      )
                      const active = itemIndex === activeIndex
                      const optionId = `${optionIdPrefix}-recent:${text}`
                      return (
                        <li
                          key={text}
                          role="option"
                          id={optionId}
                          aria-selected={active}
                        >
                          <button
                            type="button"
                            onMouseEnter={() =>
                              itemIndex >= 0 && setActiveIndex(itemIndex)
                            }
                            onClick={() => applySuggestion(text, "recent")}
                            className={cn(
                              "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              active ? "bg-black/[0.04]" : "hover:bg-black/[0.03]"
                            )}
                          >
                            <Clock
                              className="size-4 shrink-0 text-black/30"
                              aria-hidden
                            />
                            <span className="truncate text-black">{text}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}

              <SectionHeading>Popular searches</SectionHeading>
              <ul className="space-y-0.5">
                {POPULAR_SEARCHES.map((text) => {
                  const itemIndex = flatItems.findIndex(
                    (item) => item.kind === "popular" && item.text === text
                  )
                  if (itemIndex < 0) return null
                  const active = itemIndex === activeIndex
                  return (
                    <li
                      key={text}
                      role="option"
                      id={`${optionIdPrefix}-popular:${text}`}
                      aria-selected={active}
                    >
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={() => applySuggestion(text, "popular")}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                          active ? "bg-black/[0.04]" : "hover:bg-black/[0.03]"
                        )}
                      >
                        <TrendingUp
                          className="size-4 shrink-0 text-black/30"
                          aria-hidden
                        />
                        <span className="truncate text-black">{text}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <SectionHeading>Browse</SectionHeading>
              <div className="flex flex-wrap gap-2 px-3 py-2 pb-4">
                {POPULAR_CATEGORIES.map((category) => {
                  const itemIndex = flatItems.findIndex(
                    (item) =>
                      item.kind === "category" && item.href === category.href
                  )
                  const active = itemIndex === activeIndex
                  return (
                    <Link
                      key={category.href}
                      id={`${optionIdPrefix}-category:${category.href}`}
                      role="option"
                      aria-selected={active}
                      href={category.href}
                      onMouseEnter={() =>
                        itemIndex >= 0 && setActiveIndex(itemIndex)
                      }
                      onClick={() => {
                        trackSearchSuggestionClick(category.label, "category")
                        close()
                      }}
                      className={cn(
                        "inline-flex h-10 items-center rounded-full border border-black/[0.08] px-3.5 text-xs font-semibold text-black/70 transition-colors",
                        active
                          ? "border-green-600/30 bg-green-50 text-green-800"
                          : "hover:border-green-600/30 hover:bg-green-50 hover:text-green-800"
                      )}
                    >
                      {category.label}
                    </Link>
                  )
                })}
              </div>

              {trimmed.length > 0 && trimmed.length < SEARCH_MIN_CHARS ? (
                <p className="px-3 pb-4 text-center text-xs text-black/40">
                  Keep typing — search starts after {SEARCH_MIN_CHARS} characters
                </p>
              ) : null}
            </div>
          ) : status === "loading" ? (
            <ul className="space-y-1" aria-label="Loading search results">
              {Array.from({ length: 5 }, (_, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                >
                  <Skeleton className="size-12 shrink-0 rounded-lg sm:size-14" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-[75%]" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </li>
              ))}
            </ul>
          ) : status === "error" ? (
            <div className="px-3 py-8 text-center" role="alert">
              <p className="text-sm font-medium text-black">
                Search couldn&apos;t load
              </p>
              <p className="mt-1 text-sm text-black/50">
                Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => setRetryToken((token) => token + 1)}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-green-600 px-5 text-sm font-semibold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40"
              >
                Try again
              </button>
            </div>
          ) : hasTypedResults ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium text-black">No products found</p>
              <p className="mt-1 text-sm text-black/50">
                Try a set name, SKU, or browse a collection below.
              </p>
              {payload.queries.length > 0 ? (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {payload.queries.slice(0, 4).map((suggestion) => (
                    <button
                      key={suggestion.text}
                      type="button"
                      onClick={() =>
                        applySuggestion(suggestion.text, "suggestion")
                      }
                      className="inline-flex h-9 items-center rounded-full border border-black/[0.08] px-3 text-xs font-semibold text-black/70 hover:border-green-600/30 hover:bg-green-50 hover:text-green-800"
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {POPULAR_CATEGORIES.map((category) => (
                  <Link
                    key={category.href}
                    href={category.href}
                    onClick={close}
                    className="inline-flex h-10 items-center rounded-full border border-black/[0.08] px-3.5 text-xs font-semibold text-black/70 hover:border-green-600/30 hover:bg-green-50 hover:text-green-800"
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
              <Link
                href={`/search?q=${encodeURIComponent(trimmed)}`}
                onClick={(event) => {
                  event.preventDefault()
                  rememberAndGo(
                    trimmed,
                    `/search?q=${encodeURIComponent(trimmed)}`
                  )
                }}
                className="mt-5 inline-flex text-sm font-medium text-green-700 hover:text-green-800"
              >
                Open full search results
              </Link>
            </div>
          ) : (
            <div>
              {payload.products.length > 0 ? (
                <>
                  <SectionHeading>Products</SectionHeading>
                  <ul className="space-y-0.5">
                    {payload.products.map((product) => {
                      const itemIndex = flatItems.findIndex(
                        (item) =>
                          item.kind === "product" &&
                          item.product.id === product.id
                      )
                      return (
                        <SearchProductRow
                          key={product.id}
                          product={product}
                          query={trimmed}
                          active={itemIndex === activeIndex}
                          optionId={`${optionIdPrefix}-product:${product.id}`}
                          onHover={() =>
                            itemIndex >= 0 && setActiveIndex(itemIndex)
                          }
                          onSelect={() =>
                            selectProduct(product, Math.max(itemIndex, 0))
                          }
                        />
                      )
                    })}
                  </ul>
                </>
              ) : null}

              {payload.collections.length > 0 ? (
                <>
                  <SectionHeading>Collections</SectionHeading>
                  <ul className="space-y-0.5">
                    {payload.collections.map((collection) => {
                      const itemIndex = flatItems.findIndex(
                        (item) =>
                          item.kind === "collection" &&
                          item.key === `collection:${collection.id}`
                      )
                      const active = itemIndex === activeIndex
                      return (
                        <li
                          key={collection.id}
                          role="option"
                          id={`${optionIdPrefix}-collection:${collection.id}`}
                          aria-selected={active}
                        >
                          <button
                            type="button"
                            onMouseEnter={() =>
                              itemIndex >= 0 && setActiveIndex(itemIndex)
                            }
                            onClick={() =>
                              rememberAndGo(collection.title, collection.url)
                            }
                            className={cn(
                              "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                              active
                                ? "bg-black/[0.04]"
                                : "hover:bg-black/[0.03]"
                            )}
                          >
                            <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-50 ring-1 ring-black/5">
                              {collection.image ? (
                                <Image
                                  src={collection.image}
                                  alt=""
                                  width={40}
                                  height={40}
                                  sizes="40px"
                                  className="size-10 object-cover"
                                />
                              ) : (
                                <Search
                                  className="size-4 text-black/25"
                                  aria-hidden
                                />
                              )}
                            </div>
                            <span className="truncate text-sm font-medium text-black">
                              {highlightMatch(collection.title, trimmed)}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : null}

              {payload.pages.length > 0 ? (
                <>
                  <SectionHeading>Pages</SectionHeading>
                  <ul className="space-y-0.5">
                    {payload.pages.map((page) => {
                      const itemIndex = flatItems.findIndex(
                        (item) =>
                          item.kind === "page" && item.key === `page:${page.id}`
                      )
                      const active = itemIndex === activeIndex
                      return (
                        <li
                          key={page.id}
                          role="option"
                          id={`${optionIdPrefix}-page:${page.id}`}
                          aria-selected={active}
                        >
                          <button
                            type="button"
                            onMouseEnter={() =>
                              itemIndex >= 0 && setActiveIndex(itemIndex)
                            }
                            onClick={() => rememberAndGo(page.title, page.url)}
                            className={cn(
                              "flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              active
                                ? "bg-black/[0.04]"
                                : "hover:bg-black/[0.03]"
                            )}
                          >
                            {highlightMatch(page.title, trimmed)}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : null}

              {payload.queries.length > 0 ? (
                <>
                  <SectionHeading>Suggestions</SectionHeading>
                  <ul className="space-y-0.5">
                    {payload.queries.map((suggestion) => {
                      const itemIndex = flatItems.findIndex(
                        (item) =>
                          item.kind === "query" && item.text === suggestion.text
                      )
                      const active = itemIndex === activeIndex
                      return (
                        <li
                          key={suggestion.text}
                          role="option"
                          id={`${optionIdPrefix}-query:${suggestion.text}`}
                          aria-selected={active}
                        >
                          <button
                            type="button"
                            onMouseEnter={() =>
                              itemIndex >= 0 && setActiveIndex(itemIndex)
                            }
                            onClick={() =>
                              applySuggestion(suggestion.text, "suggestion")
                            }
                            className={cn(
                              "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              active
                                ? "bg-black/[0.04]"
                                : "hover:bg-black/[0.03]"
                            )}
                          >
                            <Search
                              className="size-4 shrink-0 text-black/30"
                              aria-hidden
                            />
                            {highlightMatch(suggestion.text, trimmed)}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : null}

              <div className="px-3 py-3">
                {(() => {
                  const itemIndex = flatItems.findIndex(
                    (item) => item.kind === "view_all"
                  )
                  const active = itemIndex === activeIndex
                  return (
                    <Link
                      id={`${optionIdPrefix}-view_all`}
                      role="option"
                      aria-selected={active}
                      href={`/search?q=${encodeURIComponent(trimmed)}`}
                      onMouseEnter={() =>
                        itemIndex >= 0 && setActiveIndex(itemIndex)
                      }
                      onClick={(event) => {
                        event.preventDefault()
                        rememberAndGo(
                          trimmed,
                          `/search?q=${encodeURIComponent(trimmed)}`
                        )
                      }}
                      className={cn(
                        "inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        active
                          ? "bg-green-600 text-white"
                          : "bg-green-600/10 text-green-800 hover:bg-green-600/15"
                      )}
                    >
                      View all results for “{trimmed}”
                    </Link>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
