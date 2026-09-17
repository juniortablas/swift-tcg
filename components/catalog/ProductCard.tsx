/**
 * Product card — Server Component shell with tiny client islands
 * (wishlist, quick view, add to cart).
 */

import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"

import ProductCardAddToCart from "@/components/catalog/ProductCardAddToCart"
import ProductRating from "@/components/reviews/ProductRating"
import WishlistButton from "@/components/wishlist/WishlistButton"
import { getAvailabilityBadge, getProductReleaseDate } from "@/lib/catalog"
import { isWeeklyRestockProduct, weeklyRestockLeftLabel } from "@/lib/product/weeklyRestock"
import { formatUsdPrice } from "@/lib/pricing"
import type { Product } from "@/types/product"
import { cn } from "@/lib/utils"

const ProductQuickView = dynamic(
  () => import("@/components/catalog/ProductQuickView")
)

function productHref(product: Product): string {
  if (product.url) return product.url
  if (product.slug) return `/products/${product.slug}`
  return "/products"
}

/** Featured = Coming Soon / Newest Arrivals rails. Compact kept for denser grids. */
export type ProductCardVariant = "featured" | "compact"
export type ProductCardDensity = "default" | "rail"

function formatReleaseLabel(product: Product): string | null {
  const iso = getProductReleaseDate(product)
  if (!iso) return null

  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ProductCard({
  product,
  variant = "featured",
  showQuickActions = false,
  density = "default",
  badgeOverride,
}: {
  product: Product
  variant?: ProductCardVariant
  showQuickActions?: boolean
  /** Homepage rails use a shorter image + tighter text on mobile. */
  density?: ProductCardDensity
  /** Optional CMS merchandising badge; overrides availability badge when set. */
  badgeOverride?: string | null
}) {
  const compact = variant === "compact"
  const rail = density === "rail" && !compact
  const availability = badgeOverride?.trim()
    ? {
        label: badgeOverride.trim(),
        className: "bg-black text-white",
      }
    : getAvailabilityBadge(product)
  const remaining = product.weeklyRestockRemaining ?? 0
  const showRemainingLeft =
    !compact &&
    !rail &&
    !badgeOverride?.trim() &&
    isWeeklyRestockProduct(product) &&
    remaining > 0
  const releaseLabel =
    product.status === "preorder" ||
    product.price == null ||
    product.price <= 0
      ? formatReleaseLabel(product)
      : null
  const priceLabel =
    (product.price == null || product.price <= 0) &&
    product.status !== "soldout"
      ? "Coming Soon"
      : formatUsdPrice(product.price)
  const href = productHref(product)

  return (
    <article className="group relative flex h-full w-full flex-col">
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden bg-white",
          "rounded-[12px] border border-black/[0.06] sm:rounded-[17px]",
          "shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
          "transition-[transform,box-shadow] duration-300 ease-out",
          "hover:-translate-y-1 hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.16)]"
        )}
      >
        <Link
          href={href}
          className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:ring-offset-2"
        >
          <div
            className={cn(
              "relative flex items-center justify-center overflow-hidden bg-white",
              compact
                ? "aspect-[7/8] p-2"
                : rail
                  ? "aspect-[4/5] p-1.5 sm:aspect-[7/8] sm:p-4"
                  : "aspect-square p-2 sm:aspect-[7/8] sm:p-4"
            )}
          >
            {availability ? (
              <div
                className={cn(
                  "absolute z-10 flex flex-col items-start gap-1",
                  compact
                    ? "top-2 left-2"
                    : "top-1.5 left-1.5 sm:top-3 sm:left-3"
                )}
              >
                <span
                  className={cn(
                    "rounded-full font-semibold tracking-[0.06em] uppercase",
                    compact
                      ? "px-1.5 py-0.5 text-[8px] font-bold"
                      : "px-1.5 py-0.5 text-[8px] sm:px-2.5 sm:py-1 sm:text-[10px]",
                    availability.className
                  )}
                >
                  {availability.label}
                </span>
                {showRemainingLeft ? (
                  <span className="rounded-full bg-white/95 px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.04em] text-indigo-800 uppercase ring-1 ring-indigo-600/15 sm:px-2 sm:py-1 sm:text-[10px]">
                    {weeklyRestockLeftLabel(remaining)}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
              <Image
                src={product.image}
                alt={product.imageAlt?.trim() || product.title}
                width={compact ? 240 : 400}
                height={compact ? 300 : 500}
                loading="lazy"
                sizes={
                  compact
                    ? "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                    : rail
                      ? "(max-width: 640px) 40vw, 260px"
                      : "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 280px"
                }
                className="h-full w-full scale-[1.06] bg-transparent object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out group-hover:scale-[1.12]"
              />
            </div>
          </div>

          <div
            className={cn(
              "flex flex-1 flex-col",
              compact
                ? "gap-0.5 px-2.5 pt-2 pb-2.5"
                : rail
                  ? "gap-0 px-2 pt-1.5 pb-2 sm:gap-1 sm:px-3.5 sm:pt-3.5 sm:pb-4"
                  : "gap-0 px-2 pt-2 pb-2.5 sm:gap-1 sm:px-3.5 sm:pt-3.5 sm:pb-4"
            )}
          >
            <p
              className={cn(
                "font-medium tracking-[0.12em] text-black/50 uppercase",
                compact || rail ? "text-[9px]" : "text-[9px] sm:text-[11px]"
              )}
            >
              {product.category}
            </p>
            <h3
              className={cn(
                "line-clamp-2 font-semibold tracking-tight text-black",
                compact
                  ? "min-h-[2.2em] text-[12px] leading-snug"
                  : rail
                    ? "min-h-[2.1em] text-[11px] leading-snug sm:min-h-[2.6em] sm:text-[15px]"
                    : "min-h-[2.2em] text-[12px] leading-snug sm:min-h-[2.6em] sm:text-[15px]"
              )}
            >
              {product.title}
            </h3>
            <div className={cn(compact || rail ? "mt-0.5" : "mt-0.5 sm:mt-1")}>
              <ProductRating
                average={product.reviewRating}
                count={product.reviewCount}
                size="sm"
              />
            </div>
            {releaseLabel ? (
              <p
                className={cn(
                  "font-medium text-black/45",
                  compact || rail ? "text-[10px]" : "text-[10px] sm:text-[12px]"
                )}
              >
                {releaseLabel}
              </p>
            ) : (
              <span
                className={cn(
                  "block",
                  compact || rail ? "h-0" : "hidden sm:block sm:h-[18px]"
                )}
                aria-hidden
              />
            )}
            <p
              className={cn(
                "mt-auto font-semibold tracking-tight tabular-nums",
                product.price == null || product.price <= 0
                  ? "text-black/45"
                  : "text-black",
                compact
                  ? "pt-1 text-[13px]"
                  : rail
                    ? "pt-0.5 text-[12px] sm:pt-1.5 sm:text-base"
                    : "pt-1 text-[13px] sm:pt-1.5 sm:text-base"
              )}
            >
              {priceLabel}
            </p>
          </div>
        </Link>

        <div
          className={cn(
            "absolute z-30",
            compact
              ? "top-1.5 right-1.5"
              : "top-1.5 right-1.5 sm:top-3 sm:right-3"
          )}
        >
          <WishlistButton productId={product.id} variant="card" />
        </div>

        {showQuickActions && !compact ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 aspect-square sm:aspect-[7/8]">
            <div className="pointer-events-auto absolute inset-x-1.5 bottom-1.5 flex flex-col gap-1.5 opacity-100 transition-opacity duration-300 sm:inset-x-4 sm:bottom-4 sm:gap-2 [@media(hover:hover)_and_(pointer:fine)]:pointer-events-none [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:pointer-events-auto [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:pointer-events-auto [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100">
              <div className="hidden sm:block">
                <ProductQuickView product={product} />
              </div>
              <ProductCardAddToCart product={product} />
            </div>
          </div>
        ) : null}
      </div>
    </article>
  )
}
