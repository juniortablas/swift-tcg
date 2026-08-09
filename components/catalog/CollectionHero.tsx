import Image from "next/image"

import type { CollectionPresentation } from "@/lib/catalog"

type CollectionHeroProps = {
  collection: CollectionPresentation
  productCount: number
}

/**
 * Collection page hero banner.
 *
 * `collection.images` comes from `applyStorefrontHeroToPresentation`:
 * - Shopify art → `media: "desktop" | "mobile"` pair (CDN URLs)
 * - No Shopify art → local collage fallbacks from `COLLECTIONS` (unchanged)
 */
export default function CollectionHero({
  collection,
  productCount,
}: CollectionHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[16px] sm:rounded-[24px]">
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${collection.atmosphere}`}
      />

      <div className="absolute inset-0 overflow-hidden">
        {collection.images.map((image) => {
          // Visibility classes stay as static literals here so Tailwind always
          // emits them (dynamic strings built in lib/ were easy to misread).
          const mediaClass =
            image.media === "desktop"
              ? "hidden sm:block"
              : image.media === "mobile"
                ? "sm:hidden"
                : ""

          return (
            <Image
              key={`${image.media ?? "collage"}:${image.src}:${image.className}`}
              src={image.src}
              alt={image.alt}
              width={520}
              height={520}
              unoptimized
              priority
              className={[image.className, mediaClass].filter(Boolean).join(" ")}
            />
          )
        })}
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/15 sm:via-black/45"
      />

      <div className="relative z-10 flex min-h-[128px] flex-col justify-end px-3.5 py-4 sm:min-h-[250px] sm:px-8 sm:py-9 lg:min-h-[280px] lg:px-10 lg:py-10">
        <div className="max-w-xl">
          <h1 className="text-[1.4rem] font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {collection.title}
          </h1>
          <p className="mt-1.5 line-clamp-2 max-w-md text-[12px] leading-snug text-white/75 sm:mt-3 sm:line-clamp-none sm:text-[15px] sm:leading-relaxed">
            {collection.description}
          </p>
          <p className="mt-1.5 text-[11px] font-medium tabular-nums text-white/55 sm:mt-4 sm:text-sm">
            {productCount} {productCount === 1 ? "Product" : "Products"}
          </p>
        </div>
      </div>
    </section>
  )
}
