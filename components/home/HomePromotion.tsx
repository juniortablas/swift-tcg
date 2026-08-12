import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import type { HomepagePromotion } from "@/lib/shopify/homepageMerchandising"

type HomePromotionProps = {
  promotion: HomepagePromotion | null
}

/**
 * Optional homepage promo band. Renders nothing when no active CMS entry —
 * preserves the existing homepage layout until merchants enable a promotion.
 */
export default function HomePromotion({ promotion }: HomePromotionProps) {
  if (!promotion) return null

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <Link
          href={promotion.ctaLink}
          className="group relative block overflow-hidden rounded-[12px] sm:rounded-[17px]"
        >
          <div className="relative aspect-[16/7] w-full sm:aspect-[21/7]">
            <Image
              src={promotion.mobileImage}
              alt={promotion.title}
              fill
              unoptimized
              sizes="(max-width: 639px) 100vw, 1px"
              className="object-cover sm:hidden"
            />
            <Image
              src={promotion.desktopImage}
              alt={promotion.title}
              fill
              unoptimized
              sizes="(min-width: 640px) 100vw, 1px"
              className="hidden object-cover sm:block"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15"
            />
          </div>

          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:justify-center sm:p-8 lg:p-10">
            <h2 className="max-w-xl text-[1.15rem] font-semibold tracking-tight text-white sm:text-2xl lg:text-3xl">
              {promotion.title}
            </h2>
            {promotion.description ? (
              <p className="mt-1.5 max-w-lg text-sm leading-snug text-white/80 sm:mt-2 sm:text-base">
                {promotion.description}
              </p>
            ) : null}
            <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold tracking-wide text-black shadow-[0_4px_14px_-4px_rgba(0,0,0,0.3)] transition-transform duration-300 group-hover:-translate-y-0.5 sm:mt-4 sm:px-4 sm:py-2 sm:text-sm">
              {promotion.ctaText}
              <ArrowRight className="size-3.5 sm:size-4" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  )
}
