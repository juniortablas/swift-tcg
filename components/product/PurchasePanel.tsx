"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Check, Minus, Plus } from "lucide-react"

import FinalSaleNotice from "@/components/product/FinalSaleNotice"
import WeeklyRestockNotice from "@/components/product/WeeklyRestockNotice"
import WeeklyRestockPerks from "@/components/product/WeeklyRestockPerks"
import ProductRating from "@/components/reviews/ProductRating"
import { Button } from "@/components/ui/button"
import WishlistButton from "@/components/wishlist/WishlistButton"
import { toCartItemKind } from "@/lib/cart/mixedCart"
import { useCart } from "@/lib/cart/useCart"
import {
  getAvailabilityBadge,
  getProductReleaseDate,
  getPurchaseCtaLabel,
  isPurchasable,
} from "@/lib/catalog"
import {
  trackWeeklyRestockLimitReached,
  trackWeeklyRestockReserved,
  trackWeeklyRestockViewed,
} from "@/lib/product/analytics"
import {
  isWeeklyRestockProduct,
  weeklyRestockAddableQuantity,
  weeklyRestockLimitMessage,
} from "@/lib/product/weeklyRestock"
import { formatUsdPrice } from "@/lib/pricing"
import { formatShopPayVariants } from "@/lib/shopify/shopPay"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

const NotifyMeButton = dynamic(
  () => import("@/components/back-in-stock/NotifyMeButton"),
  { ssr: false }
)

const ShopPayButton = dynamic(
  () => import("@/components/checkout/ShopPayButton"),
  { ssr: false }
)

const WHY_SWIFT = [
  "Authentic Japanese product",
  "Factory sealed",
  "Imported weekly from Japan",
  "Ships from California in 1–2 business days",
  "Fully insured, collector-grade packing",
  "Secure checkout",
] as const

function formatShipLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })
}

export default function PurchasePanel({
  product,
  shopPayStoreUrl,
}: {
  product: Product
  shopPayStoreUrl?: string | null
}) {
  const {
    addItem,
    items,
    actionError,
  } = useCart()
  const badge = getAvailabilityBadge(product, "pdp")
  const release = getProductReleaseDate(product)
  const canPurchase = isPurchasable(product)
  const isSoldOut = product.status === "soldout"
  const isWeeklyRestock = isWeeklyRestockProduct(product)
  const remaining = product.weeklyRestockRemaining ?? 0
  const limit = product.weeklyRestockLimit ?? remaining
  const addable = isWeeklyRestock
    ? weeklyRestockAddableQuantity(product, items)
    : Number.POSITIVE_INFINITY
  const [reserveQty, setReserveQty] = useState(1)
  const canReserveMore = !isWeeklyRestock || addable > 0
  const reservationLimitMessage = isWeeklyRestock
    ? !canReserveMore
      ? weeklyRestockLimitMessage(remaining)
      : actionError
    : null
  const isPreorder =
    product.status === "preorder" &&
    typeof product.price === "number" &&
    product.price > 0
  const shopPayVariants =
    canPurchase && !isWeeklyRestock && product.variantId
      ? formatShopPayVariants([{ id: product.variantId, quantity: 1 }])
      : null
  const showShopPay = Boolean(shopPayStoreUrl && shopPayVariants)

  useEffect(() => {
    if (!isWeeklyRestock) return
    setReserveQty((qty) => {
      const max = Math.max(1, addable)
      return Math.min(Math.max(1, qty), max)
    })
  }, [addable, isWeeklyRestock])

  useEffect(() => {
    if (product.weeklyRestockLimitReached) {
      trackWeeklyRestockLimitReached({
        id: product.id,
        title: product.title,
      })
    }
    if (!isWeeklyRestock) return
    trackWeeklyRestockViewed({ id: product.id, title: product.title })
  }, [
    isWeeklyRestock,
    product.id,
    product.title,
    product.weeklyRestockLimitReached,
  ])

  function handlePurchase() {
    if (!canPurchase) return
    if (isWeeklyRestock && !canReserveMore) {
      trackWeeklyRestockLimitReached(product)
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
      ...(isWeeklyRestock
        ? { quantity: Math.min(reserveQty, addable) }
        : {}),
    })
  }

  return (
    <div className="flex flex-col">
      <p className="text-[11px] font-medium tracking-[0.14em] text-black/45 uppercase">
        {product.category}
      </p>

      <h1 className="mt-1.5 line-clamp-3 text-[1.3rem] leading-[1.15] font-semibold tracking-tight text-black sm:mt-3 sm:line-clamp-2 sm:text-[2.15rem] sm:leading-[1.12] lg:text-[2.35rem]">
        {product.title}
      </h1>

      <div className="mt-2 sm:mt-3">
        <ProductRating
          average={product.reviewRating}
          count={product.reviewCount}
          size="md"
          href="#product-reviews"
        />
      </div>

      <div className="mt-3 sm:mt-5">
        {isPreorder && release ? (
          <div>
            <p className="text-[1.25rem] font-semibold tracking-tight text-black sm:text-[1.75rem]">
              {formatUsdPrice(product.price)}
            </p>
            <p className="mt-1 text-sm font-medium text-black/55">
              Preorder · Ships {formatShipLabel(release)}
            </p>
          </div>
        ) : (
          <p className="text-[1.25rem] font-semibold tracking-tight text-black sm:text-[1.75rem]">
            {formatUsdPrice(product.price)}
          </p>
        )}
      </div>

      {badge ? (
        <span
          className={cn(
            "mt-2.5 inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase sm:mt-4",
            badge.className
          )}
        >
          {badge.label}
        </span>
      ) : null}

      {isWeeklyRestock ? (
        <WeeklyRestockNotice remaining={remaining} limit={limit} />
      ) : null}

      <div className="mt-4 flex items-start gap-2.5 sm:mt-7">
        {isSoldOut ? (
          <div className="min-w-0 flex-1">
            <NotifyMeButton productId={product.id} />
          </div>
        ) : (
          <>
            {isWeeklyRestock ? (
              <div className="flex h-12 shrink-0 items-center rounded-full border border-black/10 sm:h-[52px]">
                <button
                  type="button"
                  aria-label="Decrease reservation quantity"
                  className="flex size-12 items-center justify-center text-black/55 transition-colors hover:text-black disabled:opacity-30 sm:size-[52px]"
                  disabled={reserveQty <= 1 || !canReserveMore}
                  onClick={() => setReserveQty((qty) => Math.max(1, qty - 1))}
                >
                  <Minus className="size-3.5" strokeWidth={2} />
                </button>
                <span className="min-w-7 text-center text-sm font-semibold tabular-nums text-black">
                  {canReserveMore ? reserveQty : 0}
                </span>
                <button
                  type="button"
                  aria-label="Increase reservation quantity"
                  className="flex size-12 items-center justify-center text-black/55 transition-colors hover:text-black disabled:opacity-30 sm:size-[52px]"
                  disabled={!canReserveMore || reserveQty >= addable}
                  onClick={() =>
                    setReserveQty((qty) => Math.min(addable, qty + 1))
                  }
                >
                  <Plus className="size-3.5" strokeWidth={2} />
                </button>
              </div>
            ) : null}
            <Button
              type="button"
              size="lg"
              disabled={!canPurchase || (isWeeklyRestock && !canReserveMore)}
              onClick={handlePurchase}
              className={cn(
                "h-12 flex-1 rounded-full text-[15px] font-semibold transition-all duration-200 sm:h-[52px]",
                canPurchase && (!isWeeklyRestock || canReserveMore)
                  ? "bg-indigo-600 text-white shadow-[0_10px_28px_-14px_rgba(79,70,229,0.55)] hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-[0_14px_32px_-14px_rgba(79,70,229,0.6)]"
                  : "bg-neutral-100 text-black/45"
              )}
            >
              {getPurchaseCtaLabel(product, "bag")}
            </Button>
          </>
        )}
        <WishlistButton productId={product.id} variant="pdp" />
      </div>

      {reservationLimitMessage ? (
        <p
          role="status"
          className="mt-2 text-xs font-medium text-amber-900 sm:text-[13px]"
        >
          {reservationLimitMessage}
        </p>
      ) : null}

      {isWeeklyRestock ? <WeeklyRestockPerks /> : null}

      <FinalSaleNotice />

      {showShopPay && shopPayStoreUrl && shopPayVariants ? (
        <ShopPayButton
          storeUrl={shopPayStoreUrl}
          variants={shopPayVariants}
          placement="product"
          height="52px"
          borderRadius="999px"
          showDivider
        />
      ) : null}

      <div className="mt-5 rounded-[14px] border border-black/[0.06] bg-[#f7faf8] px-3.5 py-3.5 sm:mt-8 sm:rounded-[17px] sm:px-6 sm:py-6">
        <h2 className="text-center text-[14px] font-semibold tracking-tight text-black sm:text-[15px]">
          Why Buy From Swift TCG?
        </h2>
        <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-2.5">
          {WHY_SWIFT.map((point, index) => (
            <li
              key={point}
              className={cn(
                "flex items-start gap-2.5 text-sm text-black/60",
                index % 2 === 1 && "sm:justify-self-end"
              )}
            >
              <Check
                className="mt-0.5 size-3.5 shrink-0 text-green-600"
                strokeWidth={2.5}
                aria-hidden="true"
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
