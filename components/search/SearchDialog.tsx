"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { Search } from "lucide-react"

import { getProducts } from "@/lib/catalog"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function productHref(product: Product): string {
  if (product.url) return product.url
  if (product.slug) return `/products/${product.slug}`
  return "/products"
}

function matchesQuery(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return false

  return [product.title, product.slug, product.category]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(q))
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const catalog = useMemo(
    () => [...getProducts("pokemon"), ...getProducts("onepiece")],
    []
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return catalog.filter((product) => matchesQuery(product, query)).slice(0, 12)
  }, [catalog, query])

  const close = useCallback(() => {
    onOpenChange(false)
    setQuery("")
    setActiveIndex(0)
  }, [onOpenChange])

  const selectProduct = useCallback(
    (product: Product) => {
      close()
      router.push(productHref(product))
    },
    [close, router]
  )

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

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        close()
      }
    }

    window.addEventListener("keydown", onEscape)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("keydown", onEscape)
    }
  }, [open, close])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

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
        className="relative mx-auto mt-[12vh] w-[min(100%-2rem,36rem)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_24px_80px_-24px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center gap-3 border-b border-black/5 px-4">
          <Search className="size-4 shrink-0 text-black/35" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Pokémon, One Piece…"
            aria-controls={listId}
            aria-autocomplete="list"
            className="h-14 w-full bg-transparent text-[15px] text-black outline-none placeholder:text-black/35"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setActiveIndex((index) =>
                  results.length === 0 ? 0 : (index + 1) % results.length
                )
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setActiveIndex((index) =>
                  results.length === 0
                    ? 0
                    : (index - 1 + results.length) % results.length
                )
              } else if (event.key === "Enter" && results[activeIndex]) {
                event.preventDefault()
                selectProduct(results[activeIndex])
              }
            }}
          />
          <kbd className="hidden rounded-md border border-black/10 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-black/40 sm:inline">
            ESC
          </kbd>
        </div>

        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="max-h-[min(60vh,24rem)] overflow-y-auto p-2"
        >
          {!query.trim() ? (
            <p className="px-3 py-8 text-center text-sm text-black/40">
              Search by title, set, or category
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-black/45">
              No products found.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((product, index) => {
                const active = index === activeIndex

                return (
                  <li key={`${product.category}-${product.id}`} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => selectProduct(product)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        active ? "bg-black/[0.04]" : "hover:bg-black/[0.03]"
                      )}
                    >
                      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-50 ring-1 ring-black/5">
                        <Image
                          src={product.image}
                          alt=""
                          width={48}
                          height={48}
                          unoptimized
                          className="size-10 object-contain"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium tracking-tight text-black">
                          {product.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-black/45">
                          {product.category}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
