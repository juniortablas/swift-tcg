"use client"

import Image from "next/image"

import ReviewStars from "@/components/reviews/ReviewStars"
import { highlightMatch } from "@/lib/search/highlight"
import { getAvailabilityBadge } from "@/lib/catalog"
import { formatUsdPrice } from "@/lib/pricing"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

function gameBadge(category: string): string | null {
  const value = category.toLowerCase()
  if (value.includes("one piece") || value.includes("onepiece")) {
    return "One Piece"
  }
  if (value.includes("pokemon") || value.includes("pokémon")) {
    return "Pokémon"
  }
  return null
}

type SearchProductRowProps = {
  product: Product
  query: string
  active: boolean
  optionId: string
  onSelect: () => void
  onHover: () => void
}

export default function SearchProductRow({
  product,
  query,
  active,
  optionId,
  onSelect,
  onHover,
}: SearchProductRowProps) {
  const badge = gameBadge(product.category)
  const availability = getAvailabilityBadge(product)
  const priceLabel =
    (product.price == null || product.price <= 0) &&
    product.status !== "soldout"
      ? "Coming Soon"
      : formatUsdPrice(product.price)
  const hasReviews =
    typeof product.reviewCount === "number" &&
    product.reviewCount > 0 &&
    typeof product.reviewRating === "number" &&
    product.reviewRating > 0

  return (
    <li role="option" id={optionId} aria-selected={active}>
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={onHover}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
          active ? "bg-black/[0.04]" : "hover:bg-black/[0.03]"
        )}
      >
        <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5 sm:size-14">
          {product.image ? (
            <Image
              src={product.image}
              alt=""
              width={56}
              height={56}
              sizes="56px"
              className="size-10 object-contain sm:size-12"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {badge ? (
              <span className="rounded-full bg-green-600/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-green-800 uppercase">
                {badge}
              </span>
            ) : null}
            {product.productType ? (
              <span className="truncate text-[10px] font-medium text-black/40 uppercase">
                {product.productType}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm font-medium tracking-tight text-black">
            {highlightMatch(product.title, query)}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-black/45">
            <span
              className={cn(
                "font-medium",
                product.status === "soldout"
                  ? "text-black/35"
                  : "text-black/70"
              )}
            >
              {priceLabel}
            </span>
            <span aria-hidden>·</span>
            {availability ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase",
                  availability.className
                )}
              >
                {availability.label}
              </span>
            ) : (
              <span>Available</span>
            )}
            {hasReviews ? (
              <>
                <span aria-hidden>·</span>
                <ReviewStars
                  rating={product.reviewRating!}
                  size="sm"
                  label={`${product.reviewRating!.toFixed(1)} out of 5`}
                />
              </>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  )
}
