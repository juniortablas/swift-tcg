import Link from "next/link"

import RichHtml from "@/components/content/RichHtml"
import type { ProductSpec } from "@/lib/catalog"

type ProductDetailsProps = {
  /** Pre-sanitized Shopify product body HTML. Empty hides the Description column. */
  descriptionHtml: string
  /** Shopify-backed specs. Empty hides the Specifications column. */
  specs: ProductSpec[]
  /** Collection path for internal linking (SEO). */
  collectionHref?: string | null
  collectionLabel?: string | null
}

function hasDescriptionContent(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.length > 0
}

export default function ProductDetails({
  descriptionHtml,
  specs,
  collectionHref,
  collectionLabel,
}: ProductDetailsProps) {
  const showDescription = hasDescriptionContent(descriptionHtml)
  const showSpecs = specs.length > 0
  const showCollection =
    Boolean(collectionHref?.trim()) && Boolean(collectionLabel?.trim())

  if (!showDescription && !showSpecs && !showCollection) return null

  return (
    <div
      className={
        showDescription && (showSpecs || showCollection)
          ? "grid gap-7 lg:grid-cols-2 lg:gap-14"
          : undefined
      }
    >
      {showDescription ? (
        <div className="max-w-xl">
          <h2 className="text-[1.2rem] font-semibold tracking-tight text-black sm:text-[1.5rem]">
            Description
          </h2>
          <RichHtml
            html={descriptionHtml}
            className="mt-3.5 space-y-3.5 text-[14px] leading-relaxed text-black/60 sm:mt-5 sm:space-y-4 sm:text-base sm:leading-[1.7] dark:text-black/60 [&_a]:text-black/80 dark:[&_a]:text-black/80 [&_h1]:text-black [&_h2]:text-black [&_h3]:text-black [&_h4]:text-black [&_p]:my-0 [&_strong]:text-black/80 dark:[&_h1]:text-black dark:[&_h2]:text-black dark:[&_h3]:text-black dark:[&_h4]:text-black dark:[&_strong]:text-black/80"
          />
        </div>
      ) : null}

      {showSpecs || showCollection ? (
        <div>
          <h2 className="text-[1.2rem] font-semibold tracking-tight text-black sm:text-[1.5rem]">
            Specifications
          </h2>
          <dl className="mt-3.5 overflow-hidden rounded-[17px] border border-black/[0.06] sm:mt-5">
            {showCollection ? (
              <div className="grid grid-cols-[minmax(6.5rem,38%)_1fr] gap-2.5 bg-[#fafafa] px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
                <dt className="text-sm font-medium text-black/45">
                  Collection
                </dt>
                <dd className="text-sm font-medium text-black">
                  <Link
                    href={collectionHref!}
                    className="text-green-700 underline-offset-2 hover:underline"
                  >
                    {collectionLabel}
                  </Link>
                </dd>
              </div>
            ) : null}
            {specs.map((spec, index) => {
              const rowIndex = showCollection ? index + 1 : index
              return (
                <div
                  key={spec.label}
                  className={
                    rowIndex % 2 === 0
                      ? "grid grid-cols-[minmax(6.5rem,38%)_1fr] gap-2.5 bg-[#fafafa] px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-3.5"
                      : "grid grid-cols-[minmax(6.5rem,38%)_1fr] gap-2.5 bg-white px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-3.5"
                  }
                >
                  <dt className="text-sm font-medium text-black/45">
                    {spec.label}
                  </dt>
                  <dd className="text-sm font-medium text-black">{spec.value}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      ) : null}
    </div>
  )
}
