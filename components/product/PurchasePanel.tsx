"use client"

import { Check } from "lucide-react"

import NotifyMeButton from "@/components/back-in-stock/NotifyMeButton"
import ProductRating from "@/components/reviews/ProductRating"
import { Button } from "@/components/ui/button"
import WishlistButton from "@/components/wishlist/WishlistButton"
import { toCartItemKind } from "@/lib/cart/mixedCart"
import { useCart } from "@/lib/cart/useCart"
import {
  getProductReleaseDate,
  getPurchaseCtaLabel,
  isPurchasable,
} from "@/lib/catalog"
import { formatUsdPrice } from "@/lib/pricing"
import type { Product, ProductStatus } from "@/types/product"
import { cn } from "@/lib/utils"

const WHY_SWIFT = [
  "Authentic Japanese product",
  "Factory sealed",
  "Imported weekly from Japan",
  "Ships from California in 1–2 business days",
  "Fully insured, collector-grade packing",
  "Secure checkout",
] as const

const BADGES: Partial<
  Record<ProductStatus, { label: string; className: string }>
> = {
  instock: {
    label: "In Stock",
    className: "bg-green-600 text-white",
  },
  preorder: {
    label: "Preorder",
    className: "bg-blue-600 text-white",
  },
  soldout: {
    label: "Sold Out",
    className: "bg-neutral-500/15 text-neutral-500",
  },
}

const COMING_SOON = {
  label: "Coming Soon",
  className: "bg-black/[0.06] text-black/55",
}

function availabilityBadge(product: Product) {
  if (
    (product.price == null || product.price <= 0) &&
    product.status !== "soldout"
  ) {
    return COMING_SOON
  }
  return BADGES[product.status] ?? null
}

function formatShipLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })
}

export default function PurchasePanel({ product }: { product: Product }) {
  const { addItem } = useCart()
  const badge = availabilityBadge(product)
  const release = getProductReleaseDate(product)
  const canPurchase = isPurchasable(product)
  const isSoldOut = product.status === "soldout"
  const isPreorder =
    product.status === "preorder" &&
    typeof product.price === "number" &&
    product.price > 0

  function handlePurchase() {
    if (!canPurchase) return
    const status = toCartItemKind(product.status)
    if (!status) return
    addItem({
      id: product.id,
      title: product.title,
      image: product.image,
      price: product.price,
      status,
      slug: product.slug,
      url: product.url,
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

      <div className="mt-4 flex items-start gap-2.5 sm:mt-7">
        {isSoldOut ? (
          <div className="min-w-0 flex-1">
            <NotifyMeButton productId={product.id} />
          </div>
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={!canPurchase}
            onClick={handlePurchase}
            className={cn(
              "h-12 flex-1 rounded-full text-[15px] font-semibold transition-all duration-200 sm:h-[52px]",
              canPurchase
                ? "bg-green-600 text-white shadow-[0_10px_28px_-14px_rgba(22,163,74,0.55)] hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-[0_14px_32px_-14px_rgba(22,163,74,0.6)]"
                : "bg-neutral-100 text-black/45"
            )}
          >
            {getPurchaseCtaLabel(product, "bag")}
          </Button>
        )}
        <WishlistButton productId={product.id} variant="pdp" />
      </div>

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
