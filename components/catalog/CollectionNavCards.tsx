"use client"

import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"
import type { BrowseFacet } from "@/lib/shopify/browseHierarchy"

type CollectionNavCardsProps = {
  facets: BrowseFacet[]
  /**
   * Path prefix for card links — destination is `{hrefPrefix}/{facet.slug}`.
   * Must be a string (not a function) so Server Components can pass it.
   */
  hrefPrefix: string
  selectedSlug?: string | null
  /** Section heading shown above the cards. */
  heading: string
  /** Optional reset link (e.g. "All languages"). */
  resetHref?: string | null
  resetLabel?: string
  ariaLabel?: string
  className?: string
  /**
   * When true, zero-product facets render as disabled "Coming Soon" cards.
   * When false, zero-product facets are omitted by the caller.
   */
  showComingSoon?: boolean
}

/**
 * Atmosphere gradients — cycled by facet index so future games/languages
 * get variety without hardcoding names.
 */
const ATMOSPHERES = [
  "bg-[radial-gradient(ellipse_at_85%_15%,rgba(233,213,255,0.65)_0%,transparent_42%),radial-gradient(ellipse_at_15%_100%,rgba(126,34,206,0.45)_0%,transparent_48%),linear-gradient(125deg,#2e1065_0%,#6b21a8_40%,#a21caf_100%)]",
  "bg-[radial-gradient(ellipse_at_85%_10%,rgba(254,215,170,0.6)_0%,transparent_42%),radial-gradient(ellipse_at_10%_95%,rgba(185,28,28,0.55)_0%,transparent_48%),linear-gradient(125deg,#7f1d1d_0%,#c2410c_42%,#ea580c_100%)]",
  "bg-[radial-gradient(ellipse_at_70%_30%,rgba(253,224,71,0.28)_0%,transparent_45%),linear-gradient(125deg,#020617_0%,#1e293b_48%,#334155_100%)]",
  "bg-[radial-gradient(ellipse_at_80%_20%,rgba(134,239,172,0.28)_0%,transparent_42%),linear-gradient(125deg,#052e16_0%,#14532d_45%,#166534_100%)]",
  "bg-[radial-gradient(ellipse_at_80%_20%,rgba(255,255,255,0.16)_0%,transparent_40%),linear-gradient(125deg,#000000_0%,#171717_48%,#404040_100%)]",
  "bg-[radial-gradient(ellipse_at_75%_20%,rgba(186,230,253,0.45)_0%,transparent_42%),linear-gradient(125deg,#0c4a6e_0%,#0369a1_45%,#0284c7_100%)]",
] as const

/**
 * Hierarchical browse cards for TCG games or languages.
 * Visual style matches homepage Shop by Category cards.
 */
export default function CollectionNavCards({
  facets,
  hrefPrefix,
  selectedSlug = null,
  heading,
  resetHref = null,
  resetLabel = "View all",
  ariaLabel,
  className,
  showComingSoon = true,
}: CollectionNavCardsProps) {
  const visible = showComingSoon
    ? facets
    : facets.filter((facet) => facet.productCount > 0)

  if (visible.length === 0) return null

  const gridCols =
    visible.length === 1
      ? "lg:grid-cols-2"
      : visible.length === 2
        ? "lg:grid-cols-2"
        : visible.length === 3
          ? "lg:grid-cols-3"
          : "lg:grid-cols-4"

  return (
    <section className={cn(className)} aria-label={ariaLabel ?? heading}>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-[1.1rem] font-semibold tracking-tight text-black sm:text-[1.65rem]">
          {heading}
        </h2>
        {resetHref && selectedSlug ? (
          <Link
            href={resetHref}
            className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
          >
            {resetLabel}
            <span aria-hidden="true"> →</span>
          </Link>
        ) : null}
      </div>

      <div
        role="list"
        className={cn(
          "mt-2.5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:mt-6 sm:gap-3.5 lg:grid lg:gap-4 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden",
          gridCols
        )}
      >
        {visible.map((facet, index) => {
          const selected = selectedSlug === facet.slug
          const comingSoon = facet.productCount === 0
          const atmosphere = ATMOSPHERES[index % ATMOSPHERES.length]
          const href = `${hrefPrefix.replace(/\/$/, "")}/${facet.slug}`

          const inner = (
            <>
              <div
                aria-hidden="true"
                className={cn("absolute inset-0", atmosphere)}
              />

              <div
                className={cn(
                  "absolute inset-0 overflow-hidden transition-transform duration-500 ease-out",
                  !comingSoon && "group-hover:scale-[1.04]"
                )}
              >
                {facet.imageUrl ? (
                  <Image
                    src={facet.imageUrl}
                    alt={facet.imageAlt ?? facet.label}
                    width={400}
                    height={400}
                    loading="lazy"
                    sizes="(max-width: 640px) 55vw, (max-width: 1024px) 33vw, 280px"
                    className="absolute -right-[10%] top-1/2 h-[195%] w-auto -translate-y-1/2 rotate-3 object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.5)]"
                  />
                ) : null}
              </div>

              <div
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent",
                  comingSoon && "from-black/85 via-black/50 to-black/20",
                  !comingSoon &&
                    "transition-opacity duration-300 group-hover:from-black/72 group-hover:via-black/28"
                )}
              />

              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start p-2.5 sm:p-5">
                <h3 className="text-[0.875rem] leading-none font-semibold tracking-tight text-white sm:text-lg">
                  {facet.label}
                </h3>
                <p className="mt-1 text-[10px] font-medium tracking-wide text-white/75 sm:mt-1.5 sm:text-[13px]">
                  {comingSoon
                    ? "Coming soon"
                    : `${facet.productCount} ${
                        facet.productCount === 1 ? "product" : "products"
                      }`}
                </p>
                <span
                  className={cn(
                    "mt-1.5 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide shadow-[0_4px_14px_-4px_rgba(0,0,0,0.3)] sm:mt-3 sm:px-3.5 sm:py-1.5 sm:text-xs",
                    comingSoon
                      ? "bg-white/20 text-white/80"
                      : "bg-white text-black transition-transform duration-300 group-hover:-translate-y-0.5"
                  )}
                >
                  {comingSoon
                    ? "Coming Soon"
                    : selected
                      ? "Selected"
                      : "Shop Now"}
                </span>
              </div>
            </>
          )

          if (comingSoon) {
            return (
              <div
                key={facet.handle}
                role="listitem"
                aria-label={`${facet.label} (coming soon)`}
                className="relative block h-[120px] w-[min(45vw,180px)] shrink-0 cursor-not-allowed snap-start overflow-hidden rounded-[12px] text-left opacity-70 sm:h-[190px] sm:w-[min(84vw,360px)] sm:rounded-[17px] lg:h-[200px] lg:w-auto"
              >
                {inner}
              </div>
            )
          }

          return (
            <div key={facet.handle} role="listitem" className="contents">
              <Link
                href={href}
                aria-label={`${facet.label}, ${facet.productCount} ${
                  facet.productCount === 1 ? "product" : "products"
                }`}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "group relative block h-[120px] w-[min(45vw,180px)] shrink-0 snap-start overflow-hidden rounded-[12px] text-left sm:h-[190px] sm:w-[min(84vw,360px)] sm:rounded-[17px] lg:h-[200px] lg:w-auto",
                  selected && "ring-2 ring-black ring-offset-2"
                )}
              >
                {inner}
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
