"use client"

import { useEffect, useId, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
import { Check, Eye, ShoppingBag, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toCartItemKind } from "@/lib/cart/mixedCart"
import { useCart } from "@/lib/cart/useCart"
import {
  getAvailabilityBadge,
  getProductDescription,
  getProductReleaseDate,
  getPurchaseCtaLabel,
  isPurchasable,
} from "@/lib/catalog"
import { trackWeeklyRestockLimitReached, trackWeeklyRestockReserved } from "@/lib/product/analytics"
import {
  isWeeklyRestockProduct,
  weeklyRestockAddableQuantity,
  weeklyRestockLimitMessage,
} from "@/lib/product/weeklyRestock"
import { formatUsdPrice } from "@/lib/pricing"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

type ProductQuickViewProps = {
  product: Product
  className?: string
}

const TRUST = [
  "Ships from California",
  "Factory Sealed",
  "Imported Weekly",
] as const

function productHref(product: Product): string {
  if (product.url) return product.url
  if (product.slug) return `/products/${product.slug}`
  return "/products"
}

function formatShipLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })
}

export default function ProductQuickView({
  product,
  className,
}: ProductQuickViewProps) {
  const [open, setOpen] = useState(false)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const { addItem, items } = useCart()
  const titleId = useId()
  const badge = getAvailabilityBadge(product, "pdp")
  const release = getProductReleaseDate(product)
  const purchasable = isPurchasable(product)
  const isWeeklyRestock = isWeeklyRestockProduct(product)
  const remaining = product.weeklyRestockRemaining ?? 0
  const canReserveMore = weeklyRestockAddableQuantity(product, items) > 0
  const href = productHref(product)
  const { shortDescription } = getProductDescription(product)
  const isPreorder = product.status === "preorder" && product.price != null

  useEffect(() => {
    if (!open) return

    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  function handleOpen(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    setOpen(true)
  }

  function handleAddToCart() {
    if (!purchasable) return
    if (isWeeklyRestock && !canReserveMore) {
      trackWeeklyRestockLimitReached(product)
      setOpen(false)
      return
    }
    const status = toCartItemKind(product.status)
    if (!status) return
    if (isWeeklyRestock) {
      trackWeeklyRestockReserved(product)
    }
    addItem({
      id: product.id,
      title: product.title,
      image: product.image,
      price: product.price,
      status,
      slug: product.slug,
      url: product.url,
    })
    // Close whether added or blocked so the mixed-cart dialog is unobstructed.
    setOpen(false)
  }

  const modal =
    mounted &&
    createPortal(
      <div
        className={cn(
          "fixed inset-0 z-[70]",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close quick view"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "absolute inset-x-3 top-[6%] mx-auto flex max-h-[88vh] w-auto max-w-3xl flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_64px_-24px_rgba(0,0,0,0.35)] transition-all duration-300 sm:inset-x-6 sm:top-[8%] sm:rounded-[24px]",
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
            <p className="text-sm font-semibold tracking-tight text-black">
              Quick View
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="inline-flex size-9 items-center justify-center rounded-full text-black/50 transition-colors hover:bg-black/5 hover:text-black"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="relative flex items-center justify-center bg-white p-6 sm:p-8 md:min-h-[22rem]">
              {badge ? (
                <span
                  className={cn(
                    "absolute top-4 left-4 z-10 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] uppercase",
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              ) : null}
              <Image
                src={product.image}
                alt={product.title}
                width={420}
                height={520}
                sizes="(max-width: 640px) 90vw, 420px"
                className="h-auto max-h-[280px] w-full object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.12)] sm:max-h-[340px]"
              />
            </div>

            <div className="flex flex-col px-5 py-5 sm:px-6 sm:py-6">
              <p className="text-[11px] font-medium tracking-[0.14em] text-black/45 uppercase">
                {product.category}
              </p>
              <h2
                id={titleId}
                className="mt-2 text-[1.35rem] leading-snug font-semibold tracking-tight text-black sm:text-[1.55rem]"
              >
                {product.title}
              </h2>

              <div className="mt-4">
                {isPreorder && release ? (
                  <div>
                    <p className="text-xl font-semibold tracking-tight text-black tabular-nums sm:text-2xl">
                      {formatUsdPrice(product.price)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-black/55">
                      Preorder · Ships {formatShipLabel(release)}
                    </p>
                  </div>
                ) : (
                  <p
                    className={cn(
                      "text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
                      product.price == null ? "text-black/45" : "text-black"
                    )}
                  >
                    {product.price == null && product.status !== "soldout"
                      ? "Coming Soon"
                      : formatUsdPrice(product.price)}
                  </p>
                )}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-black/55">
                {shortDescription}
              </p>

              <ul className="mt-4 space-y-2">
                {TRUST.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2 text-[13px] text-black/60"
                  >
                    <Check
                      className="size-3.5 shrink-0 text-green-600"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-2.5 pt-6">
                {isWeeklyRestock && !canReserveMore ? (
                  <p
                    role="status"
                    className="text-xs font-medium text-amber-900"
                  >
                    {weeklyRestockLimitMessage(remaining)}
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="lg"
                  disabled={!purchasable || !canReserveMore}
                  onClick={handleAddToCart}
                  className={cn(
                    "h-12 w-full rounded-full text-sm font-semibold transition-all duration-200",
                    purchasable && canReserveMore
                      ? "bg-green-600 text-white shadow-[0_10px_28px_-14px_rgba(22,163,74,0.55)] hover:-translate-y-0.5 hover:bg-green-700"
                      : "bg-neutral-100 text-black/45"
                  )}
                >
                  {purchasable ? (
                    <ShoppingBag className="size-4" aria-hidden="true" />
                  ) : null}
                  {getPurchaseCtaLabel(product, "cart")}
                </Button>

                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-black/10 text-sm font-semibold text-black transition-colors hover:border-black/20 hover:bg-neutral-50"
                >
                  View full details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/95 text-sm font-semibold text-black shadow-[0_8px_20px_-10px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-transform duration-200 hover:scale-[1.02]",
          className
        )}
      >
        <Eye className="size-3.5" aria-hidden="true" />
        Quick View
      </button>
      {modal}
    </>
  )
}
