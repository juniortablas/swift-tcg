import Image from "next/image"
import Link from "next/link"

import type { HomepageCategoryCard } from "@/lib/shopify/storefrontCms"

type ShopByCategoryProps = {
  categories: HomepageCategoryCard[]
  /** Section heading — defaults to Shop by Category. */
  title?: string
}

export default function ShopByCategory({
  categories,
  title = "Shop by Category",
}: ShopByCategoryProps) {
  const gridCols =
    categories.length <= 1
      ? "lg:grid-cols-1"
      : categories.length === 2
        ? "lg:grid-cols-2"
        : categories.length === 3
          ? "lg:grid-cols-3"
          : "lg:grid-cols-4"

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[1.1rem] font-semibold tracking-tight text-black sm:text-[1.65rem]">
            {title}
          </h2>
          <Link
            href="/pokemon"
            className="hidden text-sm font-medium text-green-600 transition-colors hover:text-green-700 sm:inline-flex sm:items-center sm:gap-1"
          >
            View all categories
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div
          className={`mt-2.5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:mt-6 sm:gap-3.5 lg:grid lg:gap-4 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden ${gridCols}`}
        >
          {categories.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group relative block h-[120px] w-[min(55vw,220px)] shrink-0 snap-start overflow-hidden rounded-[12px] sm:h-[190px] sm:w-[min(84vw,360px)] sm:rounded-[17px] lg:h-[200px] lg:w-auto"
            >
              <div
                aria-hidden="true"
                className={`absolute inset-0 ${category.atmosphere}`}
              />

              <div className="absolute inset-0 overflow-hidden transition-transform duration-500 ease-out group-hover:scale-[1.04]">
                {category.images.map((image) => (
                  <Image
                    key={image.src + image.className}
                    src={image.src}
                    alt={image.alt}
                    width={400}
                    height={400}
                    loading="lazy"
                    sizes="(max-width: 640px) 55vw, (max-width: 1024px) 360px, 25vw"
                    className={image.className}
                  />
                ))}
              </div>

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent transition-opacity duration-300 group-hover:from-black/72 group-hover:via-black/28"
              />

              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-start p-2.5 sm:p-5">
                <h3 className="text-[0.875rem] leading-none font-semibold tracking-tight text-white sm:text-lg">
                  {category.title}
                </h3>
                <p className="mt-1 text-[10px] font-medium tracking-wide text-white/75 sm:mt-1.5 sm:text-[13px]">
                  {category.subtitle}
                </p>
                <span className="mt-1.5 inline-flex w-fit items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold tracking-wide text-black shadow-[0_4px_14px_-4px_rgba(0,0,0,0.3)] transition-transform duration-300 group-hover:-translate-y-0.5 sm:mt-3 sm:px-3.5 sm:py-1.5 sm:text-xs">
                  Shop Now
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
