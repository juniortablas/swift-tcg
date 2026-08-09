import type { ProductSpec } from "@/lib/catalog"

type ProductDetailsProps = {
  paragraphs: string[]
  specs: ProductSpec[]
}

export default function ProductDetails({
  paragraphs,
  specs,
}: ProductDetailsProps) {
  return (
    <div className="grid gap-7 lg:grid-cols-2 lg:gap-14">
      <div className="max-w-xl">
        <h2 className="text-[1.2rem] font-semibold tracking-tight text-black sm:text-[1.5rem]">
          Description
        </h2>
        <div className="mt-3.5 space-y-3.5 text-[14px] leading-relaxed text-black/60 sm:mt-5 sm:space-y-4 sm:text-base sm:leading-[1.7]">
          {paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-[1.2rem] font-semibold tracking-tight text-black sm:text-[1.5rem]">
          Specifications
        </h2>
        <dl className="mt-3.5 overflow-hidden rounded-[17px] border border-black/[0.06] sm:mt-5">
          {specs.map((spec, index) => (
            <div
              key={spec.label}
              className={
                index % 2 === 0
                  ? "grid grid-cols-[minmax(6.5rem,38%)_1fr] gap-2.5 bg-[#fafafa] px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-3.5"
                  : "grid grid-cols-[minmax(6.5rem,38%)_1fr] gap-2.5 bg-white px-3.5 py-3 sm:gap-3 sm:px-5 sm:py-3.5"
              }
            >
              <dt className="text-sm font-medium text-black/45">{spec.label}</dt>
              <dd className="text-sm font-medium text-black">{spec.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
